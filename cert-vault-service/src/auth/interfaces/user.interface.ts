export interface FirebaseUser {
    id: string;
    email: string;
    emailVerified?: boolean;
    displayName?: string;
    photoURL?: string;
    // Agrega otros campos que necesites
  }