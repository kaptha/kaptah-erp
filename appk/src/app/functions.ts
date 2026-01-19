import Swal from 'sweetalert2';

/*=============================================
Sweetalert
=============================================*/
export const Sweetalert = {
    fnc: function(type: string, text: string, url: string | null): void {
        switch (type) {
            case "error":
                if(url == null){
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: text
                    }) 
                }else{
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: text
                    }).then((result) => {
                        if (result.value) { 
                            window.open(url, "_top")
                        }
                    })
                } 
                break; 
            case "success":
                if(url == null){
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: text,
                        confirmButtonText: 'OK'
                    }) 
                }else{
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: text,
                        confirmButtonText: 'OK'
                    }).then((result) => {
                        if (result.value) { 
                            window.open(url, "_top")
                        }
                    })
                } 
                break; 
            case "warning":
                Swal.fire({
                    icon: 'warning',
                    title: 'Advertencia',
                    text: text,
                    confirmButtonColor: '#f39c12',
                    timer: 4000,
                    timerProgressBar: true
                });
                break;
            case "info":
                Swal.fire({
                    icon: 'info',
                    title: 'Información',
                    text: text,
                    confirmButtonColor: '#3085d6',
                    timer: 4000,
                    timerProgressBar: true
                });
                break;
            case "loading":
                Swal.fire({
                    allowOutsideClick: false,
                    icon: 'info',
                    text: text
                })
                Swal.showLoading()
                break; 
            case "close":
                Swal.close()
                break;
        }
    },

    confirmDelete: function(title: string, text: string): Promise<boolean> {
        return new Promise((resolve) => {
            Swal.fire({
                title: title,
                text: text,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                resolve(result.isConfirmed);
            });
        });
    },

    // ✅ NUEVO: Confirmación genérica para acciones
    confirmAction: function(title: string, text: string, confirmText: string = 'Sí, continuar'): Promise<boolean> {
        return new Promise((resolve) => {
            Swal.fire({
                title: title,
                text: text,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#6c757d',
                confirmButtonText: confirmText,
                cancelButtonText: 'Cancelar',
                reverseButtons: true
            }).then((result) => {
                resolve(result.isConfirmed);
            });
        });
    },

    // ✅ OPCIONAL: Toast notification (esquina superior derecha)
    toast: function(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: type,
            title: message
        });
    },

    // ✅ OPCIONAL: Confirmación con input de texto
    confirmWithInput: function(title: string, text: string, inputPlaceholder: string = ''): Promise<string | null> {
        return new Promise((resolve) => {
            Swal.fire({
                title: title,
                text: text,
                input: 'text',
                inputPlaceholder: inputPlaceholder,
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Confirmar',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Debes escribir algo';
                    }
                    return null;
                }
            }).then((result) => {
                resolve(result.isConfirmed ? result.value : null);
            });
        });
    }
}