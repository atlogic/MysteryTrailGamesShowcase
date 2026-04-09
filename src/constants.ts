import { Checkpoint, GameData, GameSession, CheckpointResult, Language } from './types';

export const TRANSLATIONS: Record<Language, any> = {
  pl: {
    title: "Tajemniczy Szlak",
    subtitle: "Epicka gra terenowa dla dzieci, młodzieży i dorosłych. Twórz niezapomniane przygody, rozwiązuj zagadki i znajdź ukryty skarb!",
    start: "ZACZYNAMY!",
    welcome: "Witajcie na Tajemniczym Szlaku! Rozwiązujcie zagadki, skanujcie kody i wykonujcie zadania, aby dotrzeć do celu!",
    downloadGame: "Podaj numer istniejącej gry",
    enterCode: "Wpisz 6-znakowy kod gry",
    cancel: "Anuluj",
    download: "Pobierz",
    parentPanel: "Panel Rodzica",
    passwordPrompt: "Wpisz hasło, aby edytować grę",
    passwordPlaceholder: "Hasło...",
    enter: "Wejdź",
    wrongPassword: "Błędne hasło!",
    newGame: "NOWA GRA",
    printQR: "DRUKUJ KODY QR",
    myGames: "MOJE GRY",
    history: "HISTORIA",
    edit: "EDYCJA",
    addStep: "Dodaj kolejny krok",
    save: "ZAPISZ GRĘ",
    saving: "Zapisywanie...",
    teamSetup: "Stwórz Drużynę",
    teamName: "Nazwa Drużyny",
    teamMembers: "Wpiszcie swoje imiona, aby zacząć przygodę!",
    memberName: "Imię...",
    riddle: "Zagadka!",
    scanQR: "ZESKANUJ KOD QR",
    task: "Zadanie!",
    takePhoto: "ZRÓB ZDJĘCIE",
    recordAudio: "NAGRAJ GŁOS",
    evaluation: "Kto był najlepszy?",
    finish: "KONIEC!",
    congrats: "Gratulacje!",
    results: "Wyniki",
    playAgain: "ZAGRAJ JESZCZE RAZ",
    share: "Udostępnij grę",
    copyLink: "Skopiowano do schowka!",
    noGames: "Nie masz jeszcze żadnych zapisanych gier.",
    noHistory: "Brak zapisanych rozgrywek dla tej gry.",
    loading: "Wczytywanie...",
    errorMic: "Błąd mikrofonu. Sprawdź uprawnienia.",
    errorMicPermission: "Brak uprawnień do mikrofonu. Zezwól na dostęp w przeglądarce.",
    errorMicNotFound: "Nie znaleziono mikrofonu.",
    errorPhoto: "Błąd podczas robienia zdjęcia.",
    errorLoad: "Nie znaleziono gry o takim kodzie.",
    errorSave: "Błąd podczas zapisywania gry.",
    addPointsFirst: "Najpierw dodaj punkty w panelu rodzica!",
    addOneName: "Dodaj przynajmniej jedno imię!",
    enterTeamName: "Wpisz nazwę drużyny!",
    chooseBest: "Wybierz osobę, która najlepiej wykonała zadanie!",
    chooseBestDesc: "Wybierzcie osobę, która najlepiej poradziła sobie z tym zadaniem!",
    loadError: "Błąd podczas pobierania gry.",
    loadSuccess: "Gra została pomyślnie pobrana!",
    retakePhoto: "Powtórz zdjęcie",
    recordAgain: "Nagraj ponownie",
    stopRecording: "Zatrzymaj nagrywanie",
    recordAudioBtn: "Nagraj dźwięk",
    bravo: "BRAWO",
    specialMention: "Wyróżnienie",
    mostOutstanding: "Najbardziej wyróżniał się:",
    tie: "Ex aequo!",
    bestPerformer: "Najlepszy wykonawca",
    points: "punktów",
    created: "Stworzono",
    step: "Punkt",
    photo: "Zdjęcie",
    audio: "Nagranie",
    noAudio: "Brak nagrania",
    noPhoto: "Brak zdjęcia",
    back: "Wróć",
    printTitle: "Kody QR do wydrukowania",
    printDesc: "Wydrukuj tę stronę, wytnij kody QR i ukryj je w ogrodzie lub domu!",
    printButton: "Drukuj teraz",
    qrInstructions: "Ukryj ten kod w miejscu wskazanym w zagadce.",
    confirmNewGame: "Czy na pewno chcesz stworzyć nową grę? Niezapisane zmiany zostaną utracone.",
    audioRequired: "NAGRANIE",
    audioNotRequired: "BEZ NAGRANIA",
    evalRequired: "OCENA",
    evalNotRequired: "BEZ OCENY",
    qrNumber: "QR: #",
    delete: "Usuń",
    deleteStep: "Usuń punkt",
    stepName: "Nazwa punktu (np. Ogród)",
    stepHint: "Zagadka / Wskazówka",
    stepTask: "Zadanie do wykonania",
    stepImage: "Zdjęcie (opcjonalnie)",
    configTitle: "KONFIGURACJA GRY",
    code: "KOD",
    emptyRoute: "Twoja trasa jest pusta. Dodaj pierwszy punkt!",
    loadingGames: "Wczytywanie gier...",
    loadingHistory: "Wczytywanie historii...",
    noSessions: "Brak zapisanych rozgrywek dla tej gry.",
    people: "osób",
    unknown: "Nieznany",
    saveAndShare: "Zapisz i udostępnij",
    confirm: "Potwierdź",
    errorLarge: "Gra jest za duża! Spróbuj zmniejszyć zdjęcia.",
    errorQuota: "Przekroczono limit bazy danych (Quota exceeded). Spróbuj jutro.",
    errorGeneric: "Błąd podczas zapisywania. Sprawdź połączenie z internetem.",
    savedSuccess: "Gra została zapisana w chmurze! Kod: ",
    addAtLeastOne: "Dodaj przynajmniej jeden punkt gry!",
    errorProcessingImage: "Błąd podczas przetwarzania zdjęcia.",
    firstGame: "Stwórz pierwszą grę",
    loginTitle: "Zaloguj się jako Rodzic",
    loginDesc: "Zaloguj się, aby bezpiecznie zarządzać swoimi grami i historią.",
    email: "E-mail",
    password: "Hasło",
    logout: "Wyloguj się",
    noAccount: "Nie masz konta? Zarejestruj się",
    haveAccount: "Masz już konto? Zaloguj się",
    authError: "Błąd autoryzacji. Sprawdź dane.",
    signInWithGoogle: "Zaloguj przez Google",
    shareGame: "Udostępnij tę grę",
    scanToPlay: "Zeskanuj, aby zagrać w tę grę!",
    help: "Pomoc",
    howToPlay: "Jak grać?",
    helpStep1: "Zaloguj się w Panelu Rodzica",
    helpStep1Desc: "Kliknij ikonę zębatki, aby się zalogować. Dzięki temu Twoje gry będą bezpiecznie zapisane w chmurze, a Ty zyskasz dostęp do historii rozgrywek i możliwość edycji tras z dowolnego urządzenia.",
    helpStep2: "Stwórz trasę i dodaj punkty",
    helpStep2Desc: "Dodawaj kolejne kroki przygody. Do każdego punktu możesz dołączyć zdjęcie podpowiadające lokalizację (np. zdjęcie drzewa), napisać zagadkę oraz wyznaczyć zadanie do wykonania.",
    helpStep3: "Wybierz sposób weryfikacji",
    helpStep3Desc: "Podczas tworzenia gry wybierz, czy dzieci mają skanować kody QR, czy wpisywać hasła. Jeśli nie masz drukarki, hasła są idealną alternatywą - możesz je napisać na karteczkach lub ukryć w kopertach.",
    helpStep4: "Zadania i ocena starań",
    helpStep4Desc: "Dzieci mogą potwierdzać wykonanie zadań robiąc zdjęcie lub nagrywając głos. Możesz też włączyć opcję oceny – na koniec gry wybierzecie osobę, która najbardziej się starała, a aplikacja przyzna jej specjalne wyróżnienie!",
    helpStep5: "Udostępnij i graj!",
    helpStep5Desc: "Gotową grę możesz udostępnić innym rodzicom za pomocą kodu QR lub linku. Dzieci skanują kody lub wpisują hasła, rozwiązują zagadki i zdobywają punkty w drodze do skarbu!",
    helpExampleTitle: "Przykład kroku:",
    helpExampleHint: "Zagadka: 'Rosnę w tym ogrodzie najdłużej, jestem największy i patrzę na wszystkich z góry. Przy moim korzeniu ktoś ukrył wskazówkę – znajdź ją, a powiem Ci co robić dalej!'",
    helpExampleTask: "Zadanie: 'Zaśpiewajcie wspólnie wesołą piosenkę o przygodzie!'",
    createNewGame: "STWÓRZ NOWĄ GRĘ",
    close: "Zamknij",
    passcode: "Hasło (zamiast QR)",
    enterPasscode: "Wpisz hasło ze wskazówki",
    passcodePlaceholder: "np. KROK1",
    wrongPasscode: "Błędne hasło! Spróbuj ponownie.",
    orEnterPasscode: "lub wpisz hasło",
    noPrinter: "Nie masz drukarki? Użyj haseł!",
    verificationMethod: "Metoda weryfikacji",
    qrMethod: "Kody QR (skanowanie)",
    passcodeMethod: "Hasła (wpisywanie)",
    gpsMethod: "GPS (lokalizacja)",
    methodWarning: "Zmiana metody usunie obecne ustawienia weryfikacji!",
    scannerHint: "Zeskanuj kod QR, aby przejść dalej",
    gpsHint: "Dotrzyj do celu, aby odblokować zadanie",
    getCurrentLocation: "Pobierz moją pozycję",
    latitude: "Szerokość (Lat)",
    longitude: "Długość (Lng)",
    locationSuccess: "Pozycja zapisana!",
    locationError: "Błąd pobierania pozycji. Sprawdź GPS.",
    distanceToTarget: "Dystans do celu",
    pointReached: "Punkt osiągnięty! Brawo!",
    meters: "m",
    gpsThreshold: "Dokładność (promień)",
    gpsViewMode: "Tryb widoku",
    radar: "Radar",
    map: "Mapa",
    satellite: "Satelita",
    accuracyHint: "Jak blisko celu trzeba się znaleźć (np. 5m dla małych obszarów, 20m dla miasta).",
    viewModeHint: "Radar pokazuje tylko dystans. Mapa i Satelita pokazują Twoją pozycję i trasę.",
  },
  en: {
    title: "Mystery Trail",
    subtitle: "Epic outdoor game for children, youth, and adults. Create unforgettable adventures, solve riddles, and find the hidden treasure!",
    start: "START!",
    welcome: "Welcome to the Mystery Trail! Solve riddles, scan codes, and complete tasks to reach the goal!",
    downloadGame: "Enter existing game number",
    enterCode: "Enter 6-character game code",
    cancel: "Cancel",
    download: "Download",
    parentPanel: "Parent Panel",
    passwordPrompt: "Enter password to edit game",
    passwordPlaceholder: "Password...",
    enter: "Enter",
    wrongPassword: "Wrong password!",
    newGame: "NEW GAME",
    printQR: "PRINT QR CODES",
    myGames: "MY GAMES",
    history: "HISTORY",
    edit: "EDIT",
    addStep: "Add another step",
    save: "SAVE GAME",
    saving: "Saving...",
    teamSetup: "Create Team",
    teamName: "Team Name",
    teamMembers: "Enter your names to start the adventure!",
    memberName: "Name...",
    riddle: "Riddle!",
    scanQR: "SCAN QR CODE",
    task: "Task!",
    takePhoto: "TAKE PHOTO",
    recordAudio: "RECORD VOICE",
    evaluation: "Who was the best?",
    finish: "FINISH!",
    congrats: "Congratulations!",
    results: "Results",
    playAgain: "PLAY AGAIN",
    share: "Share game",
    copyLink: "Copied to clipboard!",
    noGames: "You don't have any saved games yet.",
    noHistory: "No saved sessions for this game.",
    loading: "Loading...",
    errorMic: "Microphone error. Check permissions.",
    errorMicPermission: "Microphone permission denied. Please allow access in your browser.",
    errorMicNotFound: "Microphone not found.",
    errorPhoto: "Error taking photo.",
    errorLoad: "Game code not found.",
    errorSave: "Error saving game.",
    addPointsFirst: "Add points in the parent panel first!",
    addOneName: "Add at least one name!",
    enterTeamName: "Enter team name!",
    chooseBest: "Choose the person who did the task best!",
    chooseBestDesc: "Choose the person who did best with this task!",
    loadError: "Error downloading game.",
    loadSuccess: "Game downloaded successfully!",
    retakePhoto: "Retake photo",
    recordAgain: "Record again",
    stopRecording: "Stop recording",
    recordAudioBtn: "Record audio",
    bravo: "WELL DONE",
    specialMention: "Special Mention",
    mostOutstanding: "Most outstanding:",
    tie: "It's a tie!",
    bestPerformer: "Best performer",
    points: "points",
    created: "Created",
    step: "Point",
    photo: "Photo",
    audio: "Recording",
    noAudio: "No recording",
    noPhoto: "No photo",
    back: "Back",
    printTitle: "Printable QR Codes",
    printDesc: "Print this page, cut out the QR codes, and hide them in the garden or house!",
    printButton: "Print now",
    qrInstructions: "Hide this code in the place indicated in the riddle.",
    confirmNewGame: "Are you sure you want to create a new game? Unsaved changes will be lost.",
    audioRequired: "AUDIO",
    audioNotRequired: "NO AUDIO",
    evalRequired: "EVALUATION",
    evalNotRequired: "NO EVALUATION",
    qrNumber: "QR: #",
    delete: "Delete",
    deleteStep: "Delete point",
    stepName: "Point name (e.g., Garden)",
    stepHint: "Riddle / Hint",
    stepTask: "Task to perform",
    stepImage: "Image (optional)",
    configTitle: "GAME CONFIGURATION",
    code: "CODE",
    emptyRoute: "Your route is empty. Add the first point!",
    loadingGames: "Loading games...",
    loadingHistory: "Loading history...",
    noSessions: "No saved sessions for this game.",
    people: "people",
    unknown: "Unknown",
    saveAndShare: "Save and share",
    confirm: "Confirm",
    errorLarge: "Game is too large! Try reducing image sizes.",
    errorQuota: "Database quota exceeded. Try again tomorrow.",
    errorGeneric: "Error while saving. Check your internet connection.",
    savedSuccess: "Game saved in the cloud! Code: ",
    addAtLeastOne: "Add at least one game point!",
    errorProcessingImage: "Error processing image.",
    firstGame: "Create your first game",
    loginTitle: "Parent Login",
    loginDesc: "Log in to securely manage your games and history.",
    email: "Email",
    password: "Password",
    logout: "Log Out",
    noAccount: "Don't have an account? Sign up",
    haveAccount: "Already have an account? Sign in",
    authError: "Authentication error. Check your details.",
    signInWithGoogle: "Sign in with Google",
    shareGame: "Share this game",
    scanToPlay: "Scan to play this game!",
    help: "Help",
    howToPlay: "How to play?",
    helpStep1: "Log in to the Parent Panel",
    helpStep1Desc: "Click the gear icon to log in. This keeps your games safely stored in the cloud, gives you access to game history, and lets you edit routes from any device.",
    helpStep2: "Create a route and add points",
    helpStep2Desc: "Add steps to the adventure. For each point, you can attach a photo hinting at the location (e.g., a photo of a tree), write a riddle, and set a task to perform.",
    helpStep3: "Choose verification method",
    helpStep3Desc: "When creating a game, choose whether children should scan QR codes or enter passcodes. If you don't have a printer, passcodes are a perfect alternative - you can write them on notes or hide them in envelopes.",
    helpStep4: "Tasks and effort evaluation",
    helpStep4Desc: "Children can confirm tasks by taking a photo or recording their voice. You can also enable the evaluation option – at the end of the game, you'll choose who tried hardest, and the app will give them a special mention!",
    helpStep5: "Share and play!",
    helpStep5Desc: "You can share your finished game with other parents via QR code or link. Children scan codes or enter passcodes, solve riddles, and earn points on their way to the treasure!",
    helpExampleTitle: "Step Example:",
    helpExampleHint: "Riddle: 'I've been growing in this garden the longest, I'm the biggest and look down on everyone. Someone hid a clue at my root – find it, and I'll tell you what to do next!'",
    helpExampleTask: "Task: 'Sing a happy song about an adventure together!'",
    createNewGame: "CREATE NEW GAME",
    close: "Close",
    passcode: "Passcode (instead of QR)",
    enterPasscode: "Enter passcode from the clue",
    passcodePlaceholder: "e.g. STEP1",
    wrongPasscode: "Wrong passcode! Try again.",
    orEnterPasscode: "or enter passcode",
    noPrinter: "No printer? Use passcodes!",
    verificationMethod: "Verification method",
    qrMethod: "QR Codes (scanning)",
    passcodeMethod: "Passcodes (typing)",
    gpsMethod: "GPS (location)",
    methodWarning: "Changing method will clear current verification settings!",
    scannerHint: "Scan the QR code to proceed",
    gpsHint: "Reach the destination to unlock the task",
    getCurrentLocation: "Get my position",
    latitude: "Latitude",
    longitude: "Longitude",
    locationSuccess: "Position saved!",
    locationError: "Error getting position. Check GPS.",
    distanceToTarget: "Distance to target",
    pointReached: "Point reached! Well done!",
    meters: "m",
    gpsThreshold: "Accuracy (radius)",
    gpsViewMode: "View mode",
    radar: "Radar",
    map: "Map",
    satellite: "Satellite",
    accuracyHint: "How close to the target you need to get (e.g., 5m for small areas, 20m for city).",
    viewModeHint: "Radar shows only distance. Map and Satellite show your position and route.",
  }
};
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit, orderBy, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './firebase';

export const DEFAULT_CHECKPOINTS: Checkpoint[] = [
  {
    id: '1',
    name: "Wielkie Drzewo",
    hint: "Szukaj tam, gdzie liście szumią najgłośniej i dają najwięcej cienia.",
    task: "Zróbcie 5 pajacyków razem!",
    requirePhoto: false,
    qrNumber: 1,
    passcode: "DRZEWO1"
  },
  {
    id: '2',
    name: "Ławka w Ogrodzie",
    hint: "Miejsce, gdzie można usiąść i odpocząć po długim biegu.",
    task: "Znajdźcie coś czerwonego i zróbcie temu zdjęcie!",
    requirePhoto: true,
    qrNumber: 2,
    passcode: "LAWKA2"
  }
];

export const STORAGE_KEY = 'mystery_trail_config';
export const GAME_ID_KEY = 'mystery_trail_id';
export const PARENT_ID_KEY = 'mystery_trail_parent_id';

export const generateGameId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const getParentId = () => {
  return auth.currentUser?.uid || null;
};

export const saveGameToFirebase = async (
  gameId: string, 
  checkpoints: Checkpoint[], 
  verificationMethod: 'qr' | 'passcode' | 'gps' = 'qr',
  gpsThreshold: number = 20,
  gpsViewMode: 'radar' | 'map' | 'satellite' = 'radar'
): Promise<string> => {
  const path = `games/${gameId}`;
  try {
    const parentId = getParentId();
    if (!parentId) throw new Error("User not authenticated");
    
    // Check if game exists and who owns it
    const gameRef = doc(db, 'games', gameId);
    const snap = await getDoc(gameRef);
    
    let targetId = gameId;
    if (snap.exists()) {
      const existingData = snap.data() as GameData;
      if (existingData.parentId !== parentId) {
        // User is not the owner, generate a new ID (Remix/Copy)
        targetId = generateGameId();
      }
    }
    
    const finalRef = doc(db, 'games', targetId);
    await setDoc(finalRef, {
      id: targetId,
      parentId,
      checkpoints,
      createdAt: Date.now(),
      verificationMethod,
      gpsThreshold,
      gpsViewMode
    });
    return targetId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return gameId;
  }
};

export const loadUserGamesFromFirebase = async (): Promise<GameData[]> => {
  const path = `games`;
  try {
    const parentId = getParentId();
    if (!parentId) return [];
    
    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, where('parentId', '==', parentId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as GameData);
  } catch (error) {
    // If index is missing, fallback to simple query
    try {
      const parentId = getParentId();
      if (!parentId) return [];
      
      const gamesRef = collection(db, 'games');
      const q = query(gamesRef, where('parentId', '==', parentId));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as GameData).sort((a, b) => b.createdAt - a.createdAt);
    } catch (innerError) {
      handleFirestoreError(innerError, OperationType.LIST, path);
      return [];
    }
  }
};

export const loadGameFromFirebase = async (gameId: string): Promise<GameData | null> => {
  const path = `games/${gameId}`;
  try {
    const gameRef = doc(db, 'games', gameId);
    const snap = await getDoc(gameRef);
    if (snap.exists()) {
      return snap.data() as GameData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const saveSessionToFirebase = async (session: GameSession) => {
  const path = `sessions/${session.id}`;
  console.log(`[Firestore] Starting saveSessionToFirebase for session: ${session.id}`);
  try {
    const { results, ...sessionData } = session;
    const sessionRef = doc(db, 'sessions', session.id);
    
    console.log(`[Firestore] Saving session metadata to: ${path}`, sessionData);
    // Save session metadata first
    await setDoc(sessionRef, sessionData);
    console.log(`[Firestore] Session metadata saved successfully.`);
    
    // Save each result individually to avoid batch size limits (10MB)
    // and to handle individual document size limits (1MB)
    if (results && results.length > 0) {
      console.log(`[Firestore] Saving ${results.length} results to sub-collection...`);
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const resultId = `${session.id}_res_${i}`;
        const resultRef = doc(db, `sessions/${session.id}/results`, resultId);
        
        console.log(`[Firestore] Saving result ${i} to: sessions/${session.id}/results/${resultId}`);
        try {
          // Check result size roughly
          const size = JSON.stringify(result).length;
          console.log(`[Firestore] Result ${i} approximate size: ${Math.round(size / 1024)} KB`);
          
          await setDoc(resultRef, result);
          console.log(`[Firestore] Result ${i} saved successfully.`);
        } catch (itemError: any) {
          console.error(`[Firestore] Could not save result ${i} (likely size limit or permission):`, itemError);
          // We continue saving other results even if one fails
        }
      }
    } else {
      console.log(`[Firestore] No results to save for this session.`);
    }
    console.log(`[Firestore] Session save process completed.`);
  } catch (error) {
    console.error(`[Firestore] Critical error saving session:`, error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const loadSessionResults = async (sessionId: string): Promise<CheckpointResult[]> => {
  const path = `sessions/${sessionId}/results`;
  try {
    const resultsRef = collection(db, `sessions/${sessionId}/results`);
    const snap = await getDocs(resultsRef);
    return snap.docs.map(doc => doc.data() as CheckpointResult);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const loadSessionsFromFirebase = async (gameId: string): Promise<GameSession[]> => {
  const path = `sessions`;
  try {
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef, 
      where('gameId', '==', gameId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as GameSession);
  } catch (error) {
    // Fallback if index is missing
    try {
      const sessionsRef = collection(db, 'sessions');
      const q = query(
        sessionsRef, 
        where('gameId', '==', gameId),
        limit(10)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as GameSession).sort((a, b) => b.timestamp - a.timestamp);
    } catch (innerError) {
      handleFirestoreError(innerError, OperationType.LIST, path);
      return [];
    }
  }
};
