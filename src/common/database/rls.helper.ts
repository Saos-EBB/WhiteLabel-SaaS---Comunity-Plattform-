import { DataSource, EntityManager } from 'typeorm';

// Executes fn inside a transaction on a single, pinned QueryRunner connection,
// with app.current_user_id set for the duration via SET LOCAL.
//
// SET LOCAL is transaction-scoped: the value is visible to all queries on this
// connection while the transaction is open, and is automatically cleared when
// the transaction ends (commit or rollback).  Because we hold the QueryRunner
// open until fn resolves, every query inside fn runs on the same physical
// connection and therefore sees the correct RLS context.
//
// Usage in a service:
//
//   return withRls(this.dataSource, userId, async (manager) => {
//     const row = await manager.findOne(ProfileSensitiveData, { where: { user_id: userId } });
//     ...
//   });
//
// Pass manager.getRepository(Entity) if you need a typed Repository:
//
//   const repo = manager.getRepository(ProfileSensitiveData);
//
export async function withRls<T>(
  dataSource: DataSource,
  userId: string,
  fn: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    // SET LOCAL is visible only within this transaction and on this connection.
    await qr.query('SET LOCAL app.current_user_id = $1', [userId]);
    const result = await fn(qr.manager);
    await qr.commitTransaction();
    return result;
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}
