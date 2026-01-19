export class UsersModel{

	nombre:string = '';
	email:string = '';
	password?:string = '';
	rfc?:string = '';
	tipo_persona?:string = '';
	telefono:string = '';
	fiscalReg?: string;
	//rol:string;
	returnSecureToken?:boolean = false;
	Confirm?:boolean = true;
	firebaseUid?: string;
	realtimeDbKey?: string;
	//roles:string;	
	//idToken:string = '';
	
}