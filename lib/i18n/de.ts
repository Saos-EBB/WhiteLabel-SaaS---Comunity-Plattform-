export interface Translations {
  common: {
    save: string
    cancel: string
    loading: string
    error: string
    back: string
    retry: string
    delete: string
    confirm: string
    close: string
    edit: string
    yes: string
    no: string
    comingSoon: string
    years: string
    deleting: string
    saved: string
    showPassword: string
    hidePassword: string
  }
  nav: {
    home: string
    discover: string
    requests: string
    chat: string
    profile: string
    admin: string
    settings: string
  }
  status: {
    label: string
    choose: string
    invisible: string
    available: string
    lookingToTalk: string
    lookingForDate: string
    busy: string
    doNotDisturb: string
  }
  relativeTime: {
    justNow: string
    minutesAgo: string
    hoursAgo: string
    daysAgo: string
    daysAgoPlural: string
  }
  notifications: {
    label: string
    title: string
    tabNew: string
    tabHistory: string
    emptyNew: string
    emptyNewDesc: string
    emptyHistory: string
    emptyHistoryDesc: string
    markAllRead: string
    markAllReadShort: string
    deleteAll: string
    showAll: string
    deleteNotification: string
    filterLabel: string
    loadingLabel: string
    loadError: string
    typeMessage: string
    typeMatch: string
    typeSystem: string
    typeBan: string
    typeRequest: string
  }

  login: {
    title: string
    emailOrNickname: string
    emailOrNicknamePlaceholder: string
    password: string
    forgotPassword: string
    submit: string
    submitting: string
    noAccount: string
    register: string
    helpAndSupport: string
    setupDone: string
    failed: string
  }
  setup: {
    title: string
    subtitle: string
    email: string
    nickname: string
    nicknamePlaceholder: string
    password: string
    passwordPlaceholder: string
    passwordConfirm: string
    submit: string
    submitting: string
    errorTooShort: string
    errorMismatch: string
    errorFailed: string
  }
  consent: {
    title: string
    subtitle: string
    loading: string
    agb: string
    privacy: string
    sensitiveData: string
    checkboxLabel: string
    submit: string
    submitting: string
    errorLoad: string
    errorSave: string
  }
  onboarding: {
    stepPhoto: string
    stepInterests: string
    stepBio: string
    stepDone: string
    skip: string
    next: string
    finish: string
    back: string
    welcomeTitle: string
    welcomeBody: string
    start: string
    photoSubtitle: string
    interestsSubtitle: string
    doneTitle: string
    doneBody: string
    discover: string
    stepLabel: string
    createProfile: string
    profileSubtitle: string
    nickname: string
    nicknamePlaceholder: string
    nicknameHint: string
    nicknameRequired: string
    nicknameTooShort: string
    nicknameTooLong: string
    nicknameInvalid: string
    birthdate: string
    birthdateRequired: string
    birthdateTooYoung: string
    city: string
    aboutMe: string
    gender: string
    genderMale: string
    genderFemale: string
    genderNonBinary: string
    genderDiverse: string
    lookingFor: string
    lookingForFriendship: string
    lookingForRelationship: string
    lookingForExchange: string
    lookingForAll: string
    choosePhoto: string
    photoTypeError: string
    photoSizeError: string
    interestsMinError: string
    noChoice: string
    cityRequired: string
    bioPlaceholder: string
    photoUploadFailed: string
    savingProfile: string
    savingSubtitle: string
    errorGeneric: string
    retryButton: string
  }
  profile: {
    editProfile: string
    saveProfile: string
    setupTitle: string
    loadError: string
    retry: string
    underReview: string
    profilePhoto: string
    audioSection: string
    record: string
    chooseFile: string
    stop: string
    recordAgain: string
    upload: string
    uploading: string
    waitingApproval: string
    replace: string
    approved: string
    deleteAudio: string
    rejected: string
    newRecording: string
    micUnavailable: string
    bioPlaceholder: string
    noBio: string
    interests: string
    noInterestsAvailable: string
    noInterestsAdded: string
    cancel: string
    save: string
    edit: string
    logout: string
    nicknameChangeTitle: string
    nicknameChangeBody: string
    nicknameChangeConfirm: string
    genderChangeTitle: string
    genderChangeBody: string
    genderChangeConfirm: string
    visibilityPublic: string
    visibilityPrivate: string
    years: string
  }
  publicProfile: {
    notFound: string
    notFoundDesc: string
    loadError: string
    genderMale: string
    genderFemale: string
    genderNonBinary: string
    genderDiverse: string
    lookingForFriendship: string
    lookingForRelationship: string
    lookingForExchange: string
    lookingForAll: string
    connect: string
    message: string
    pending: string
    accept: string
    decline: string
    connected: string
    chat: string
    disconnect: string
    blocked: string
    unblock: string
    report: string
    block: string
    disconnectTitle: string
    disconnectDesc: string
    blockTitle: string
    blockDesc: string
    blockConfirm: string
    introduction: string
    interests: string
    underReview: string
    years: string
    chatOpenError: string
  }
  dashboard: {
    loadError: string
    error: string
    welcomeArea: string
    welcome: string
    unreadOne: string
    unreadMany: string
    noNotifications: string
    discover: string
    discoverAriaLabel: string
    messages: string
    quickAccess: string
    findPeople: string
    findPeopleDesc: string
    conversations: string
    requests: string
    requestsDesc: string
    requestsAriaLabel: string
    recentNotifications: string
    recentNotificationsArea: string
    notificationList: string
    unreadAriaLabel: string
  }
  settings: {
    title: string
    loadError: string
    comingSoon: string
    sectionDesign: string
    sectionNotifications: string
    sectionVisibility: string
    sectionAccount: string
    sectionSecurity: string
    sectionSubscription: string
    sectionSupport: string
    lightMode: string
    lightModeDesc: string
    profanityFilter: string
    fontSize: string
    fontSizeNormal: string
    fontSizeLarge: string
    fontSizeXL: string
    highContrast: string
    easyLanguage: string
    uiLanguage: string
    preview: string
    previewText: string
    notifEmail: string
    notifPush: string
    notifNewMessages: string
    notifNewMatches: string
    notifSystem: string
    visibilityProfilePublic: string
    visibilityPublicDesc: string
    visibilityPrivateDesc: string
    visibilityOnlineStatus: string
    visibilityBio: string
    visibilityCity: string
    visibilityAge: string
    visibilityGender: string
    visibilityInterests: string
    visibilityAudio: string
    logout: string
    subscription: string
    noSubscription: string
    deleteAccount: string
    exportData: string
    validUntil: string
    changePassword: string
    changeEmail: string
    currentPassword: string
    newPassword: string
    newPasswordPlaceholder: string
    confirmPassword: string
    passwordChanged: string
    newEmailAddress: string
    emailUpdated: string
    noBlockedUsers: string
    unblock: string
    unblockConfirmTitle: string
    unblockConfirmDesc: string
    subscriptionActive: string
    subscriptionMonthly: string
    subscriptionYearly: string
    subscriptionLifetime: string
    cancelSubscription: string
    cancelSubscriptionConfirm: string
    supportText: string
    reportProblem: string
    deleteAccountTitle: string
    deleteAccountWarning1: string
    deleteAccountWarning2: string
    deleteAccountWarning3: string
    deleteAccountConfirm: string
  }
  chat: {
    title: string
    empty: string
    emptyDesc: string
    loadError: string
    retry: string
    noMessages: string
    blocked: string
    blockedBy: string
    inputPlaceholder: string
    inputAriaLabel: string
    sendAriaLabel: string
    backToList: string
    conversation: string
    moreOptions: string
    deleteChat: string
    reportUser: string
    blockUser: string
    messageDeleted: string
    startConversation: string
    deleteChatTitle: string
    deleteChatDesc: string
    deleteChatConfirm: string
    blockTitle: string
    blockDesc: string
    blockConfirm: string
    deleteMessageTitle: string
    deleteMessageDesc: string
    deleteMessageConfirm: string
    deleteMessageConfirming: string
    shortUserId: string
    loadingConversations: string
    conversationList: string
    conversationWith: string
    sendingAriaLabel: string
    sendErrorAriaLabel: string
    loadingMessages: string
    typingAriaLabel: string
    scrollDownAriaLabel: string
  }
  ban: {
    screenText: string
    contactSupport: string
    logout: string
  }
  report: {
    title: string
    username: string
    usernamePlaceholder: string
    reason: string
    reasonPlaceholder: string
    description: string
    descriptionPlaceholder: string
    submit: string
    successTitle: string
    successDesc: string
    errorNoUsername: string
    errorFailed: string
    reasonHarassment: string
    reasonSpam: string
    reasonFakeProfile: string
    reasonInappropriate: string
    reasonAbuse: string
  }
  support: {
    title: string
    email: string
    nickname: string
    profileId: string
    message: string
    submit: string
    cancel: string
    successTitle: string
    successDesc: string
    emailPlaceholder: string
    nicknamePlaceholder: string
    profileIdPlaceholder: string
    messagePlaceholder: string
  }
  admin: {
    tabTickets: string
    tabMedia: string
    tabUsers: string
    tabReports: string
    tabStrikes: string
    tabProfanity: string
    tabManagement: string
    swipeAll: string
    swipePhotos: string
    swipeAudio: string
    swipeNoPending: string
    swipeClose: string
    swipeReject: string
    swipeApprove: string
    swipeSpacePlay: string
    swipeModeClose: string
    ticketsReports: string
    ticketsSupportRequests: string
    ticketsRefresh: string
    ticketsNoReports: string
    ticketsNoSupport: string
    mediaPending: string
    mediaSwipeMode: string
    mediaNoMedia: string
    mediaImages: string
    mediaAudio: string
    mediaItem: string
    usersColNickname: string
    usersColRole: string
    usersColStatus: string
    usersColCreated: string
    usersColActions: string
    usersFilterAllRoles: string
    usersFilterAll: string
    usersFilterBanned: string
    usersFilterActive: string
    usersSearch: string
    usersNotFound: string
    usersVulnerable: string
    usersAutoSuspend: string
    usersReset: string
    usersSent: string
    usersEmail: string
    usersUnban: string
    usersBan: string
    reportsFilterAll: string
    reportsFilterOpen: string
    reportsFilterReviewed: string
    reportsFilterClosed: string
    reportsLoad: string
    reportsNone: string
    reportsAdminNote: string
    strikesTitle: string
    strikesNew: string
    strikesRevoked: string
    strikesNone: string
    strikesColUser: string
    strikesColType: string
    strikesColReason: string
    strikesColExpires: string
    strikesColCreated: string
    profanityTitle: string
    profanityNewWord: string
    profanityAdd: string
    profanityNone: string
    managementAdmins: string
    managementCreateAdmin: string
    managementPromote: string
    managementDemote: string
    managementNoAdmins: string
    managementSettings: string
    managementNoSettings: string
    managementCreatedId: string
    managementCreateAdminButton: string
    managementRoleAdmin: string
    managementRoleOwner: string
    settingsAutoSuspend: string
    settingsAutoSuspendDesc: string
    toastMediaApproved: string
    toastMediaRejected: string
    toastUnbanned: string
    toastRoleSaved: string
    toastReportUpdated: string
    toastStrikeCreated: string
    toastWordAdded: string
    toastWordRemoved: string
    toastSettingSaved: string
    toastUserBanned: string
    toastEmailUpdated: string
    toastUserNotFound: string
    rejectModalTitle: string
    rejectModalReasonLabel: string
    rejectModalReasonPlaceholder: string
    emailModalTitle: string
    emailModalLabel: string
    strikeModalTitle: string
    strikeModalNickname: string
    strikeModalType: string
    strikeTypeWarning: string
    strikeTypeSuspension: string
    strikeTypeBan: string
    strikeModalExpiry: string
    strikeModalReason: string
    strikeModalReasonPlaceholder: string
    strikeModalSubmit: string
    removeWordTitle: string
    removeWordDesc: string
    removeWordConfirm: string
    total: string
    prevPage: string
    nextPage: string
    toastPromoted: string
    toastDemoted: string
    swipeProgress: string
    loadError: string
    usersSearchPlaceholder: string
    strikesSearchPlaceholder: string
    nicknamePlaceholder: string
    managementPasswordPlaceholder: string
    mediaAlt: string
    usersResetAriaLabel: string
    usersEmailAriaLabel: string
    usersRoleAriaLabel: string
    profanityRemoveAriaLabel: string
    autoSuspendBadge: string
  }
}

export const de: Translations = {
  common: {
    save: 'Speichern',
    cancel: 'Abbrechen',
    loading: 'Lädt...',
    error: 'Ein Fehler ist aufgetreten.',
    back: 'Zurück',
    retry: 'Erneut versuchen',
    delete: 'Löschen',
    confirm: 'Bestätigen',
    close: 'Schließen',
    edit: 'Bearbeiten',
    yes: 'Ja',
    no: 'Nein',
    comingSoon: 'Bald verfügbar',
    years: 'Jahre',
    deleting: 'Löschen…',
    saved: 'Gespeichert',
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort verbergen',
  },

  nav: {
    home: 'Home',
    discover: 'Discover',
    requests: 'Requests',
    chat: 'Chat',
    profile: 'Profile',
    admin: 'Admin',
    settings: 'Einstellungen',
  },

  status: {
    label: 'Online-Status ändern',
    choose: 'Status wählen',
    invisible: 'Unsichtbar',
    available: 'Verfügbar',
    lookingToTalk: 'Suche Gespräch',
    lookingForDate: 'Suche Date',
    busy: 'Beschäftigt',
    doNotDisturb: 'Nicht stören',
  },

  relativeTime: {
    justNow: 'gerade eben',
    minutesAgo: 'vor {mins} Min.',
    hoursAgo: 'vor {hours} Std.',
    daysAgo: 'vor {days} Tag',
    daysAgoPlural: 'vor {days} Tagen',
  },

  notifications: {
    label: 'Benachrichtigungen',
    title: 'Benachrichtigungen',
    tabNew: 'Neu',
    tabHistory: 'Verlauf',
    emptyNew: 'Keine neuen Benachrichtigungen',
    emptyNewDesc: 'Du hast keine ungelesenen Benachrichtigungen.',
    emptyHistory: 'Kein Verlauf',
    emptyHistoryDesc: 'Gelesene Benachrichtigungen erscheinen hier.',
    markAllRead: 'Alle als gelesen',
    markAllReadShort: 'Alle lesen',
    deleteAll: 'Alle löschen',
    showAll: 'Alle anzeigen',
    deleteNotification: 'Benachrichtigung löschen',
    filterLabel: 'Benachrichtigungen filtern',
    loadingLabel: 'Lädt Benachrichtigungen',
    loadError: 'Benachrichtigungen konnten nicht geladen werden',
    typeMessage: 'Nachricht',
    typeMatch: 'Match',
    typeSystem: 'System',
    typeBan: 'Gesperrt',
    typeRequest: 'Anfrage',
  },

  login: {
    title: 'Willkommen zurück',
    emailOrNickname: 'E-Mail oder Nickname',
    emailOrNicknamePlaceholder: 'name@beispiel.de oder nickname',
    password: 'Passwort',
    forgotPassword: 'Passwort vergessen?',
    submit: 'Anmelden',
    submitting: 'Wird angemeldet…',
    noAccount: 'Noch kein Konto?',
    register: 'Registrieren',
    helpAndSupport: 'Hilfe & Support',
    setupDone: 'Setup abgeschlossen. Bitte einloggen.',
    failed: 'Anmeldung fehlgeschlagen',
  },

  setup: {
    title: 'Ersteinrichtung',
    subtitle: 'Erstelle den Owner-Account für die Plattform.',
    email: 'E-Mail',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Dein Anzeigename',
    password: 'Passwort',
    passwordPlaceholder: 'Mindestens 8 Zeichen',
    passwordConfirm: 'Passwort bestätigen',
    submit: 'Setup abschließen',
    submitting: 'Wird eingerichtet…',
    errorTooShort: 'Passwort muss mindestens 8 Zeichen lang sein',
    errorMismatch: 'Passwörter stimmen nicht überein',
    errorFailed: 'Setup fehlgeschlagen',
  },

  consent: {
    title: 'Zustimmung erforderlich',
    subtitle: 'Bitte stimme den folgenden Bedingungen zu, um fortzufahren.',
    loading: 'Wird geladen…',
    agb: 'AGB',
    privacy: 'Datenschutzerklärung',
    sensitiveData: 'Verarbeitung sensibler Daten',
    checkboxLabel: 'Ich stimme den {label} zu.',
    submit: 'Zustimmen & weiter',
    submitting: 'Wird gespeichert…',
    errorLoad: 'Inhalte konnten nicht geladen werden.',
    errorSave: 'Fehler beim Speichern der Zustimmung',
  },

  onboarding: {
    stepPhoto: 'Foto hinzufügen',
    stepInterests: 'Interessen wählen',
    stepBio: 'Über dich',
    stepDone: 'Fertig!',
    skip: 'Überspringen',
    next: 'Weiter',
    finish: 'Abschließen',
    back: 'Zurück',
    welcomeTitle: 'Willkommen bei XXX!',
    welcomeBody: 'Richte dein Profil ein damit andere dich finden können.',
    start: "Los geht's",
    photoSubtitle: '(optional, aber empfohlen)',
    interestsSubtitle: 'Wähle mindestens ein Interesse',
    doneTitle: 'Du bist bereit! 🎉',
    doneBody: 'Dein Profil ist jetzt sichtbar für andere Nutzer.',
    discover: 'Jetzt entdecken',
    stepLabel: 'Schritt {step} von {total}',
    createProfile: 'Erstelle dein Profil',
    profileSubtitle: 'Diese Angaben helfen anderen, dich zu finden.',
    nickname: 'Nickname',
    nicknamePlaceholder: 'z.B. coolcat99',
    nicknameHint: '3–30 Zeichen · Buchstaben, Ziffern, _, - und .',
    nicknameRequired: 'Nickname ist erforderlich',
    nicknameTooShort: 'Mindestens 3 Zeichen',
    nicknameTooLong: 'Maximal 30 Zeichen',
    nicknameInvalid: 'Nur Buchstaben, Ziffern, _, - und . erlaubt',
    birthdate: 'Geburtsdatum',
    birthdateRequired: 'Geburtsdatum ist erforderlich',
    birthdateTooYoung: 'Du musst mindestens 18 Jahre alt sein',
    city: 'Stadt',
    aboutMe: 'Über mich',
    gender: 'Geschlecht',
    genderMale: 'Mann',
    genderFemale: 'Frau',
    genderNonBinary: 'Nicht-binär',
    genderDiverse: 'Divers',
    lookingFor: 'Ich suche',
    lookingForFriendship: 'Freundschaft',
    lookingForRelationship: 'Beziehung',
    lookingForExchange: 'Austausch',
    lookingForAll: 'Offen für alles',
    choosePhoto: 'Foto wählen',
    photoTypeError: 'Nur JPEG, PNG und WebP erlaubt',
    photoSizeError: 'Datei zu groß. Maximal 5 MB erlaubt.',
    interestsMinError: 'Bitte wähle mindestens ein Interesse aus',
    noChoice: 'Keine Angabe',
    cityRequired: 'Stadt ist erforderlich',
    bioPlaceholder: 'Erzähl ein bisschen über dich…',
    photoUploadFailed: 'Foto-Upload fehlgeschlagen',
    savingProfile: 'Fast fertig…',
    savingSubtitle: 'Wir richten dein Profil ein.',
    errorGeneric: 'Etwas ist schiefgelaufen',
    retryButton: 'Erneut versuchen',
  },

  profile: {
    editProfile: 'Profil bearbeiten',
    saveProfile: 'Profil speichern',
    setupTitle: 'Profil einrichten',
    loadError: 'Profil konnte nicht geladen werden',
    retry: 'Erneut versuchen',
    underReview: 'Wird überprüft',
    profilePhoto: 'Profilbild',
    audioSection: 'Vorstellung / Audio',
    record: 'Aufnehmen',
    chooseFile: 'Datei wählen',
    stop: 'Stop',
    recordAgain: 'Nochmal',
    upload: 'Hochladen',
    uploading: 'Wird hochgeladen…',
    waitingApproval: 'Warte auf Freigabe',
    replace: 'Ersetzen',
    approved: 'Freigegeben',
    deleteAudio: 'Löschen',
    rejected: 'Abgelehnt',
    newRecording: 'Neue Aufnahme',
    micUnavailable: 'Mikrofon nicht verfügbar',
    bioPlaceholder: 'Erzähl etwas über dich…',
    noBio: 'Noch keine Bio hinzugefügt.',
    interests: 'Interessen',
    noInterestsAvailable: 'Keine Interessen verfügbar.',
    noInterestsAdded: 'Noch keine Interessen hinzugefügt.',
    cancel: 'Abbrechen',
    save: 'Speichern',
    edit: 'Bearbeiten',
    logout: 'Abmelden',
    nicknameChangeTitle: 'Nickname ändern?',
    nicknameChangeBody: 'Dein öffentlicher Link ändert sich. Alle alten Links sind dann ungültig.',
    nicknameChangeConfirm: 'Trotzdem ändern',
    genderChangeTitle: 'Geschlecht ändern?',
    genderChangeBody: 'Das Geschlecht kann nur einmal geändert werden.',
    genderChangeConfirm: 'Ändern',
    visibilityPublic: 'Öffentlich',
    visibilityPrivate: 'Privat',
    years: 'Jahre',
  },

  publicProfile: {
    notFound: 'Profil nicht gefunden',
    notFoundDesc: 'Das Profil existiert nicht oder ist nicht öffentlich.',
    loadError: 'Profil konnte nicht geladen werden',
    genderMale: 'Mann',
    genderFemale: 'Frau',
    genderNonBinary: 'Nicht-binär',
    genderDiverse: 'Divers',
    lookingForFriendship: 'Freundschaft',
    lookingForRelationship: 'Beziehung',
    lookingForExchange: 'Austausch',
    lookingForAll: 'Offen für alles',
    connect: 'Verbinden',
    message: 'Direktnachricht',
    pending: 'Ausstehend ✓',
    accept: 'Annehmen',
    decline: 'Ablehnen',
    connected: 'Verbunden ✓',
    chat: 'Chatten →',
    disconnect: 'Trennen',
    blocked: 'Blockiert',
    unblock: 'Entblocken',
    report: 'User melden',
    block: 'Nutzer blockieren',
    disconnectTitle: 'Verbindung trennen?',
    disconnectDesc: 'Der Chat wird ebenfalls gelöscht und kann nicht wiederhergestellt werden.',
    blockTitle: 'Nutzer blockieren?',
    blockDesc: 'Der Nutzer kann dich dann nicht mehr kontaktieren und dein Profil nicht mehr sehen.',
    blockConfirm: 'Blockieren',
    introduction: 'Vorstellung',
    interests: 'Interessen',
    underReview: 'Wird überprüft',
    years: 'Jahre',
    chatOpenError: 'Fehler beim Öffnen des Chats',
  },

  dashboard: {
    loadError: 'Fehler beim Laden',
    error: 'Etwas ist schiefgelaufen',
    welcomeArea: 'Willkommensbereich',
    welcome: 'Willkommen zurück, {nickname} 👋',
    unreadOne: 'Du hast {count} ungelesene Benachrichtigung',
    unreadMany: 'Du hast {count} ungelesene Benachrichtigungen',
    noNotifications: 'Keine neuen Benachrichtigungen',
    discover: 'Menschen entdecken',
    discoverAriaLabel: 'Profile in deiner Nähe entdecken',
    messages: 'Nachrichten',
    quickAccess: 'Schnellzugriff',
    findPeople: 'Menschen finden',
    findPeopleDesc: 'Entdecke Profile in deiner Nähe',
    conversations: 'Deine Gespräche',
    requests: 'Anfragen',
    requestsDesc: 'Neue Kontaktanfragen warten',
    requestsAriaLabel: 'Kontaktanfragen anzeigen',
    recentNotifications: 'Benachrichtigungen',
    recentNotificationsArea: 'Aktuelle Benachrichtigungen',
    notificationList: 'Benachrichtigungsliste',
    unreadAriaLabel: 'Ungelesen',
  },

  settings: {
    title: 'Einstellungen',
    loadError: 'Einstellungen konnten nicht geladen werden',
    comingSoon: 'Bald verfügbar',
    sectionDesign: 'Design & Barrierefreiheit',
    sectionNotifications: 'Benachrichtigungen',
    sectionVisibility: 'Sichtbarkeit',
    sectionAccount: 'Konto',
    sectionSecurity: 'Sicherheit & Blockierungen',
    sectionSubscription: 'Abonnement & Zahlung',
    sectionSupport: 'Support',
    lightMode: 'Heller Modus',
    lightModeDesc: 'Wechsle zwischen dunklem und hellem Design',
    profanityFilter: 'Schimpfwortfilter',
    fontSize: 'Schriftgröße',
    fontSizeNormal: 'Normal',
    fontSizeLarge: 'Groß',
    fontSizeXL: 'Sehr groß',
    highContrast: 'Hoher Kontrast',
    easyLanguage: 'Einfache Sprache',
    uiLanguage: 'Sprache der Benutzeroberfläche',
    preview: 'Vorschau',
    previewText: 'Das ist ein Beispieltext...',
    notifEmail: 'E-Mail',
    notifPush: 'Push',
    notifNewMessages: 'Neue Nachrichten',
    notifNewMatches: 'Neue Matches',
    notifSystem: 'Systemmeldungen',
    visibilityProfilePublic: 'Profil öffentlich',
    visibilityPublicDesc: 'Andere Nutzer können dich finden',
    visibilityPrivateDesc: 'Nur du siehst dein Profil',
    visibilityOnlineStatus: 'Online-Status',
    visibilityBio: 'Bio',
    visibilityCity: 'Stadt',
    visibilityAge: 'Alter',
    visibilityGender: 'Geschlecht & Suche',
    visibilityInterests: 'Interessen',
    visibilityAudio: 'Vorstellung / Audio',
    logout: 'Abmelden',
    subscription: 'Abonnement',
    noSubscription: 'Kein aktives Abonnement',
    deleteAccount: 'Konto löschen',
    exportData: 'Daten exportieren (PDF)',
    validUntil: 'Läuft bis',
    changePassword: 'Passwort ändern',
    changeEmail: 'E-Mail ändern',
    currentPassword: 'Aktuelles Passwort',
    newPassword: 'Neues Passwort',
    newPasswordPlaceholder: 'Mindestens 8 Zeichen',
    confirmPassword: 'Neues Passwort bestätigen',
    passwordChanged: 'Passwort geändert',
    newEmailAddress: 'Neue E-Mail-Adresse',
    emailUpdated: 'E-Mail wurde aktualisiert',
    noBlockedUsers: 'Keine blockierten Nutzer',
    unblock: 'Entsperren',
    unblockConfirmTitle: 'Bestätigen',
    unblockConfirmDesc: 'Möchtest du die Blockierung aufheben?',
    subscriptionActive: 'Aktiv',
    subscriptionMonthly: 'Monatlich',
    subscriptionYearly: 'Jährlich',
    subscriptionLifetime: 'Lebenslang',
    cancelSubscription: 'Abonnement kündigen',
    cancelSubscriptionConfirm: 'Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.',
    supportText: 'Hast du ein Problem oder eine Frage? Wir helfen dir gerne.',
    reportProblem: 'Problem melden',
    deleteAccountTitle: 'Konto löschen?',
    deleteAccountWarning1: 'Dein Profil wird dauerhaft gelöscht.',
    deleteAccountWarning2: 'Alle Chats und Verbindungen werden entfernt.',
    deleteAccountWarning3: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    deleteAccountConfirm: 'Konto endgültig löschen',
  },

  chat: {
    title: 'Nachrichten',
    empty: 'Noch keine Gespräche',
    emptyDesc: 'Verbinde dich mit anderen Nutzern, um zu chatten',
    loadError: 'Fehler beim Laden',
    retry: 'Erneut versuchen',
    noMessages: 'Noch keine Nachrichten',
    blocked: 'Du hast diesen Nutzer blockiert.',
    blockedBy: 'Dieser Nutzer hat dich blockiert.',
    inputPlaceholder: 'Nachricht schreiben…',
    inputAriaLabel: 'Nachricht eingeben',
    sendAriaLabel: 'Nachricht senden',
    backToList: 'Zurück zur Nachrichtenliste',
    conversation: 'Gespräch',
    moreOptions: 'Mehr Optionen',
    deleteChat: 'Chat löschen',
    reportUser: 'User melden',
    blockUser: 'Nutzer blockieren',
    messageDeleted: 'Nachricht gelöscht',
    startConversation: 'Noch keine Nachrichten. Starte das Gespräch!',
    deleteChatTitle: 'Chat löschen?',
    deleteChatDesc: 'Der Chat wird nur bei dir gelöscht. Die andere Person sieht ihn weiterhin.',
    deleteChatConfirm: 'Löschen',
    blockTitle: 'Nutzer blockieren?',
    blockDesc: 'Der Nutzer wird aus deiner Suche entfernt. Du kannst ihm keine Nachrichten mehr senden. Diese Aktion kann rückgängig gemacht werden.',
    blockConfirm: 'Blockieren',
    deleteMessageTitle: 'Nachricht löschen?',
    deleteMessageDesc: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    deleteMessageConfirm: 'Löschen',
    deleteMessageConfirming: 'Löschen…',
    shortUserId: 'Nutzer {id}',
    loadingConversations: 'Lädt Gespräche',
    conversationList: 'Gespräche',
    conversationWith: 'Gespräch mit {nickname}',
    sendingAriaLabel: 'Wird gesendet',
    sendErrorAriaLabel: 'Fehler beim Senden',
    loadingMessages: 'Lädt Nachrichten',
    typingAriaLabel: 'Tipp-Indikator',
    scrollDownAriaLabel: 'Nach unten scrollen',
  },

  ban: {
    screenText: 'Dein Account wurde gesperrt.',
    contactSupport: 'Support kontaktieren',
    logout: 'Abmelden',
  },

  report: {
    title: 'User melden',
    username: 'Nutzername',
    usernamePlaceholder: 'Nickname eingeben',
    reason: 'Grund',
    reasonPlaceholder: 'Bitte wählen…',
    description: 'Beschreibung',
    descriptionPlaceholder: 'Beschreibe das Problem…',
    submit: 'Melden',
    successTitle: 'Meldung wurde übermittelt',
    successDesc: 'Das Fenster schließt sich automatisch.',
    errorNoUsername: 'Bitte gib einen Nutzernamen ein',
    errorFailed: 'Fehler beim Senden',
    reasonHarassment: 'Belästigung',
    reasonSpam: 'Spam',
    reasonFakeProfile: 'Fake-Profil',
    reasonInappropriate: 'Unangemessene Inhalte',
    reasonAbuse: 'Missbrauch',
  },

  support: {
    title: 'Support kontaktieren',
    email: 'E-Mail',
    nickname: 'Nickname',
    profileId: 'Profil-ID',
    message: 'Nachricht',
    submit: 'Absenden',
    cancel: 'Abbrechen',
    successTitle: 'Anfrage übermittelt',
    successDesc: 'Deine Anfrage wurde übermittelt. Wir melden uns per E-Mail.',
    emailPlaceholder: 'name@beispiel.de',
    nicknamePlaceholder: 'Dein Nickname',
    profileIdPlaceholder: 'z.B. #ID-A4F2',
    messagePlaceholder: 'Beschreibe dein Anliegen…',
  },

  admin: {
    tabTickets: 'Tickets',
    tabMedia: 'Medien',
    tabUsers: 'Nutzer',
    tabReports: 'Meldungen',
    tabStrikes: 'Strikes',
    tabProfanity: 'Schimpfwörter',
    tabManagement: 'Verwaltung',
    swipeAll: 'Alle',
    swipePhotos: 'Fotos',
    swipeAudio: 'Audio',
    swipeNoPending: 'Keine ausstehenden Medien',
    swipeClose: 'Schließen',
    swipeReject: 'Ablehnen',
    swipeApprove: 'Freigeben',
    swipeSpacePlay: 'Leertaste zum Abspielen',
    swipeModeClose: 'Swipe-Modus schließen',
    ticketsReports: 'Meldungen ({count})',
    ticketsSupportRequests: 'Support Anfragen ({count})',
    ticketsRefresh: 'Aktualisieren',
    ticketsNoReports: 'Keine offenen Meldungen',
    ticketsNoSupport: 'Keine offenen Support Anfragen',
    mediaPending: 'Ausstehende Medien',
    mediaSwipeMode: 'Swipe-Modus',
    mediaNoMedia: 'Keine ausstehenden Medien',
    mediaImages: 'Bilder',
    mediaAudio: 'Audio',
    mediaItem: 'Medium',
    usersColNickname: 'Nickname',
    usersColRole: 'Rolle',
    usersColStatus: 'Status',
    usersColCreated: 'Erstellt',
    usersColActions: 'Aktionen',
    usersFilterAllRoles: 'Alle Rollen',
    usersFilterAll: 'Alle',
    usersFilterBanned: 'Gesperrt',
    usersFilterActive: 'Aktiv',
    usersSearch: 'Suchen',
    usersNotFound: 'Keine Nutzer gefunden',
    usersVulnerable: 'Vulnerabel',
    usersAutoSuspend: 'Auto-Suspend',
    usersReset: 'Reset',
    usersSent: 'Gesendet',
    usersEmail: 'E-Mail',
    usersUnban: 'Entsperren',
    usersBan: 'Sperren',
    reportsFilterAll: 'Alle Status',
    reportsFilterOpen: 'Offen',
    reportsFilterReviewed: 'Geprüft',
    reportsFilterClosed: 'Geschlossen',
    reportsLoad: 'Laden',
    reportsNone: 'Keine Meldungen gefunden',
    reportsAdminNote: 'Notiz für Admins…',
    strikesTitle: 'Strike-Liste',
    strikesNew: 'Neuer Strike',
    strikesRevoked: 'AUFGEHOBEN',
    strikesNone: 'Keine Strikes vorhanden',
    strikesColUser: 'Nutzer',
    strikesColType: 'Typ',
    strikesColReason: 'Grund',
    strikesColExpires: 'Läuft ab',
    strikesColCreated: 'Erstellt',
    profanityTitle: 'Benutzerdefinierte Wörter',
    profanityNewWord: 'Neues Wort…',
    profanityAdd: 'Hinzufügen',
    profanityNone: 'Keine benutzerdefinierten Wörter',
    managementAdmins: 'Admins',
    managementCreateAdmin: 'Neues Admin-Konto erstellen',
    managementPromote: 'Zum Admin',
    managementDemote: 'Zurückstufen',
    managementNoAdmins: 'Keine Admins vorhanden',
    managementSettings: 'System-Einstellungen',
    managementNoSettings: 'Keine Einstellungen vorhanden',
    managementCreatedId: 'erstellt · ID:',
    managementCreateAdminButton: 'Admin erstellen',
    managementRoleAdmin: 'Admin',
    managementRoleOwner: 'Owner',
    settingsAutoSuspend: 'Auto-Suspend Schwellenwert',
    settingsAutoSuspendDesc: 'Anzahl unabhängiger offener Meldungen bis zur automatischen Sperre',
    toastMediaApproved: 'Medium genehmigt',
    toastMediaRejected: 'Medium abgelehnt',
    toastUnbanned: 'Sperre aufgehoben',
    toastRoleSaved: 'Rolle gespeichert',
    toastReportUpdated: 'Meldung aktualisiert',
    toastStrikeCreated: 'Strike erstellt',
    toastWordAdded: 'Wort hinzugefügt',
    toastWordRemoved: 'Wort entfernt',
    toastSettingSaved: 'Einstellung gespeichert',
    toastUserBanned: 'Nutzer gesperrt',
    toastEmailUpdated: 'E-Mail aktualisiert',
    toastUserNotFound: 'Kein Nutzer mit diesem Nicknamen gefunden',
    rejectModalTitle: 'Medium ablehnen',
    rejectModalReasonLabel: 'Ablehnungsgrund',
    rejectModalReasonPlaceholder: 'Warum wird das Medium abgelehnt?',
    emailModalTitle: 'E-Mail ändern – {nickname}',
    emailModalLabel: 'Neue E-Mail-Adresse',
    strikeModalTitle: 'Neuer Strike',
    strikeModalNickname: 'Nickname suchen *',
    strikeModalType: 'Typ *',
    strikeTypeWarning: 'Verwarnung',
    strikeTypeSuspension: 'Sperre',
    strikeTypeBan: 'Bann',
    strikeModalExpiry: 'Ablaufdatum *',
    strikeModalReason: 'Grund * (mind. 10 Zeichen)',
    strikeModalReasonPlaceholder: 'Begründung für den Strike…',
    strikeModalSubmit: 'Strike erstellen',
    removeWordTitle: 'Wort entfernen?',
    removeWordDesc: 'Das Wort {word} wird aus der Filterliste entfernt.',
    removeWordConfirm: 'Entfernen',
    total: 'Gesamt',
    prevPage: 'Vorige Seite',
    nextPage: 'Nächste Seite',
    toastPromoted: '{nickname} ist jetzt Admin',
    toastDemoted: '{nickname} wurde zurückgestuft',
    swipeProgress: '{current} von {total}',
    loadError: 'Fehler beim Laden',
    usersSearchPlaceholder: 'Nickname suchen…',
    strikesSearchPlaceholder: 'Nickname suchen...',
    nicknamePlaceholder: 'Nickname eingeben…',
    managementPasswordPlaceholder: 'Passwort (min. 8 Zeichen)',
    mediaAlt: 'Medium von {nickname}',
    usersResetAriaLabel: 'Passwort-Reset für {nickname} senden',
    usersEmailAriaLabel: 'E-Mail von {nickname} ändern',
    usersRoleAriaLabel: 'Rolle von {nickname}',
    profanityRemoveAriaLabel: '{word} entfernen',
    autoSuspendBadge: 'Automatische Sperre',
  },
}
