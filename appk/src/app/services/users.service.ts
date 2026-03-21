import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { UsersModel } from '../models/users.model';
import { AuthService } from './auth.service';
import { Api, 
         Register, 
         Login, 
         SendEmailVerification, 
         ConfirmEmailVerification, 
         GetUserData, 
         SendPasswordResetEmail,
         VerifyPasswordResetCode,
         ConfirmPasswordReset } from '../config';


declare var jQuery:any;
declare var $:any;
interface PatchResponse {
  idToken?: string;
  [key: string]: any;
}
@Injectable({
  providedIn:'root'
})

export class UsersService {
  private apiUrl: string = Api.url;
  private api:string = Api.url;
  private mysqlApiUrl: string = Api.mysqlUrl;
  // Agregar la URL para PostgreSQL
  private postgresApiUrl: string = Api.postgresUrl;
  private register:string = Register.url;
  private login:string = Login.url;
  private sendEmailVerification:string = SendEmailVerification.url;
  private confirmEmailVerification:string = ConfirmEmailVerification.url;
  private getUserData:string = GetUserData.url;
  private sendPasswordResetEmail:string = SendPasswordResetEmail.url;
  private verifyPasswordResetCode:string = VerifyPasswordResetCode.url;
  private confirmPasswordReset:string = ConfirmPasswordReset.url;
  
  constructor(private http:HttpClient, private authService: AuthService){ }
  /*=============================================
  Registro en Firebase Authentication
  =============================================*/
  
  registerAuth(user: UsersModel){

    return this.http.post(`${this.register}`, user);

  }
  /*=============================================
    Login en Firebase Authentication
  =============================================*/
  
    loginAuth(user: UsersModel) {
  return this.http.post(`${this.login}`, user);
} 
  /*=============================================
    Enviar verificación de correo electrónico
  =============================================*/
  

    sendEmailVerificationFnc(body:object){

      return this.http.post(`${this.sendEmailVerification}`, body);

    }

  /*=============================================
    Confirmar email de verificación
  =============================================*/

    confirmEmailVerificationFnc(body:object){

      return this.http.post(`${this.confirmEmailVerification}`, body);

    }
  /*=============================================
    Actualizar data de usuario
  =============================================*/

    patchData(id: string, value: any, authToken?: string) {
  // Primero intentamos usar el token proporcionado, si no, buscamos en localStorage
  const token = authToken || localStorage.getItem('idToken');
  const authParam = token ? `?auth=${token}` : '';
  
  console.log('🔧 patchData - token usado:', token);
  console.log('🔧 patchData - URL:', `${this.api}usuarios/${id}.json${authParam}`);
  
  return this.http.patch<PatchResponse>(
    `${this.api}usuarios/${id}.json${authParam}`, 
    value
  ).pipe(
    tap(response => console.log('✅ Patch Response:', response)),
    map(response => ({
      ...response,
      idToken: value.idToken
    }))
  );
}
  /*=============================================
  Registro en PostgreSQL
  =============================================*/
  registerDatabasePostgres(user: UsersModel) {
    delete user.password;
    return this.http.post(`${this.postgresApiUrl}/users/register`, user);
  }
  /*=============================================
  Registro en Firebase Realtime Database
  MODIFICADO: Limpia campos que Firebase no acepta
  =============================================*/
  registerDatabase(user: any, authToken?: string){
    // Crear una copia limpia del objeto
    const cleanUser = { ...user };
    
    // Eliminar campos que Firebase Realtime Database no acepta
    delete cleanUser.password;
    delete cleanUser.tipo_persona;
    delete cleanUser.fiscalReg;
    const authParam = authToken ? `?auth=${authToken}` : '';
    console.log('📤 Enviando a Firebase Realtime DB:', cleanUser);
    
    return this.http.post(`${this.api}usuarios.json${authParam}`, cleanUser);
  }  
  
  /*=============================================
  Registro en MySQL
  =============================================*/
  registerDatabaseMySQL(user: UsersModel) {
    //console.log('Sending request to:', `${this.mysqlApiUrl}/users/register`);
    delete user.password;
    return this.http.post(`${this.mysqlApiUrl}/users/register`, user);
  }
  
  /*=============================================
  Registro completo (Firebase + MySQL + PostgreSQL)
  NOTA: Este método ya no se usa en el nuevo flujo de registro
  =============================================*/
  registerUser(user: UsersModel) {
  // Primero, registra en Firebase
  return this.registerDatabase(user).pipe(
    switchMap((firebaseResponse: any) => {
      // Añade el UID de Firebase al objeto de usuario
      user.realtimeDbKey = firebaseResponse.name; // Esta es la clave correcta
      user.firebaseUid = user.firebaseUid || ''; // Asegurarse de que firebaseUid esté definido
      
      // Luego, registra en MySQL
      return this.registerDatabaseMySQL(user).pipe(
        // Finalmente, registra en PostgreSQL
        switchMap(mysqlResponse => {
          return this.registerDatabasePostgres(user);
        })
      );
    })
  );
}
  /*=============================================
    Filtrar para buscar coincidencias RFC
  =============================================*/
    getFilterData(orderBy: string, equalTo: string, authToken?: string): Observable<any> {
  // LOGS DE DEBUG
  console.log('🔍 getFilterData llamado con:');
  console.log('  - orderBy:', orderBy);
  console.log('  - equalTo:', equalTo);
  console.log('  - authToken:', authToken);
  console.log('  - authToken length:', authToken?.length);
  
  // Si se proporciona un token, agregarlo a la URL
  const authParam = authToken ? `&auth=${authToken}` : '';
  
  const fullUrl = `${this.api}usuarios.json?orderBy="${orderBy}"&equalTo="${equalTo}"&print=pretty${authParam}`;
  console.log('🌐 URL completa a llamar:', fullUrl);
  
  return this.http.get(fullUrl);
}
    /*=============================================
    Filtrar para buscar con nodo de usuario
  =============================================*/
  getUserByToken(token: string): Observable<any> {
  console.log('Buscando usuario con token:', token);
  const authParam = token ? `&auth=${token}` : '';
  
  return this.http.get(
    `${this.api}usuarios.json?orderBy="idToken"&equalTo="${token}"${authParam}`
  ).pipe(
    map((response: any) => {
      if (!response) {
        return null;
      }
      const users = Object.keys(response).map(key => ({
      id: response[key].firebaseUid,
      realtimeDbKey: key,
      ...response[key]
      }));
      return users.length > 0 ? users[0] : null;
    })
  );
}

  /*=============================================
    NUEVO: Actualizar datos de usuario en MySQL
  =============================================*/
  updateUserData(userData: any): Observable<any> {
    const idToken = localStorage.getItem('idToken');
    
    if (!idToken) {
      throw new Error('No se encontró el token de autenticación');
    }

    // Primero obtenemos el usuario por token para obtener su firebaseUid
    return this.getUserByToken(idToken).pipe(
      switchMap(user => {
        if (!user || !user.firebaseUid) {
          throw new Error('No se encontró el usuario');
        }

        const firebaseUid = user.firebaseUid;
        
        console.log('Actualizando usuario:', { firebaseUid, userData });

        // Preparar datos para MySQL
        const mysqlData = {
          nombre: userData.nombre,
          nombreComercial: userData.nombreComercial || '',
          phone: userData.phone,
          rfc: userData.rfc.toUpperCase(),
          tipoPersona: userData.tipoPersona || 'fisica',
          fiscalReg: userData.fiscalReg,
          email: userData.email,
          firebaseUid: firebaseUid
        };

        console.log('Datos a enviar a MySQL:', mysqlData);

        // Actualizar solo en MySQL
        return this.http.put(
          `${this.mysqlApiUrl}/users/update`,
          mysqlData
        );
      })
    );
  }

  /*=============================================
    Validar idToken de Autenticación
  =============================================*/
  authActivate(){ 

      return new Promise(resolve=>{

      /*=============================================
        Validamos que el idToken sea real
        =============================================*/
        if(localStorage.getItem("idToken")){

          let body = {

            idToken: localStorage.getItem("idToken") 
          }
      
        this.http.post(`${this.getUserData}`, body)
        .subscribe((resp: any)=>{  

          /*=============================================
            Validamos fecha de expiración
            =============================================*/
            if(localStorage.getItem("expiresIn")){

              let expiresIn = Number(localStorage.getItem("expiresIn"));

              let expiresDate = new Date();
              expiresDate.setTime(expiresIn);

              if(expiresDate > new Date()){

                resolve(true)
              
              }else{

                localStorage.removeItem('idToken');
                  localStorage.removeItem('expiresIn');
                resolve(false)
              }

            }else{

              localStorage.removeItem('idToken');
              localStorage.removeItem('expiresIn');
              resolve(false)
            
            }


        },err =>{
          
          localStorage.removeItem('idToken');
          localStorage.removeItem('expiresIn');
          resolve(false)

        })

      }else{

        localStorage.removeItem('idToken');
            localStorage.removeItem('expiresIn');   
        resolve(false)  
      }

    })  

    }
    /*=============================================
    Resetear la contraseña
    =============================================*/
    sendPasswordResetEmailFnc(body:object){

      return this.http.post(`${this.sendPasswordResetEmail}`, body)

    }

  /*=============================================
  Enviar verificacion de email con plantilla branded (via Resend)
  =============================================*/
  sendBrandedEmailVerification(email: string, displayName?: string) {
    return this.http.post(`${this.mysqlApiUrl}/auth-email/send-verification`, { email, displayName });
  }

  /*=============================================
  Enviar reset de password con plantilla branded (via Resend)
  =============================================*/
  sendBrandedPasswordReset(email: string) {
    return this.http.post(`${this.mysqlApiUrl}/auth-email/send-password-reset`, { email });
  }
    /*=============================================
    Confirmar el cambio de la contraseña
    =============================================*/
    verifyPasswordResetCodeFnc(body:object){

      return this.http.post(`${this.verifyPasswordResetCode}`, body)

    }
    /*=============================================
    Enviar la contraseña
    =============================================*/
    confirmPasswordResetFnc(body:object){

      return this.http.post(`${this.confirmPasswordReset}`, body)

    }
    
}


