/*=============================================
Exportamos el endPoint de la APIREST de Firebase
=============================================*/
export let Api = {

	url: 'https://kaptah-cfdi-default-rtdb.firebaseio.com/', 
	mysqlUrl: 'http://localhost:3000/api',
	postgresUrl: 'http://localhost:3000/api'
}
/*=============================================
=            Firebase Auth            =
=============================================*/

export let Register = {
	url: 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBo8MXnWkR0b5gMN_UqMKWDhK6JZef2bFA'
}
/*=============================================
EndPoint para el ingreso de usuarios en Firebase Authentication
=============================================*/

export let Login = {

	url: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBo8MXnWkR0b5gMN_UqMKWDhK6JZef2bFA'
}
/*=============================================
EndPoint para enviar verificación de correo electrónico
=============================================*/
export let SendEmailVerification = {
	url: 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=AIzaSyBo8MXnWkR0b5gMN_UqMKWDhK6JZef2bFA'
}
/*=============================================
EndPoint para confirmar email de verificación
=============================================*/

export let ConfirmEmailVerification = {

	url: 'https://identitytoolkit.googleapis.com/v1/accounts:update?key=AIzaSyBo8MXnWkR0b5gMN_UqMKWDhK6JZef2bFA'

}
/*=============================================
EndPoint para tomar la data del usuario en Firebase auth
=============================================*/

export let GetUserData = {

	url: 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyBo8MXnWkR0b5gMN_UqMKWDhK6JZef2bFA'

}

/*=============================================
EndPoint para Resetear la contraseña
=============================================*/

export let SendPasswordResetEmail = {

 url: 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=AIzaSyBo8MXnWkR0b5gMN_UqMKWDhK6JZef2bFA'

}
/*=============================================
EndPoint para confirmar el cambio de la contraseña
=============================================*/

export let VerifyPasswordResetCode = {

	url: 'https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=AIzaSyBo8MXnWkR0b5gMN_UqMKWDhK6JZef2bFA'

}

/*=============================================
EndPoint para enviar la contraseña
=============================================*/

export let ConfirmPasswordReset = {

	url:'https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=AIzaSyBo8MXnWkR0b5gMN_UqMKWDhK6JZef2bFA'

}