import { Component, ViewEncapsulation } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LandingComponent {
  activeTab = 'plataforma';
  fade = false;
  ngOnInit() {
  window.addEventListener('scroll', this.revealOnScroll);
  window.addEventListener('scroll', this.checkScrollTop);
}
contactEmail = 'contacto@kaptah.com';
contactPhone = '+52 000 000 0000';

sending = false;
sentOk = false;
showScrollTop = false;
contactForm = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(2)]],
  email: ['', [Validators.required, Validators.email]],
  phone: [''],
  subject: ['', [Validators.required, Validators.minLength(3)]],
  message: ['', [Validators.required, Validators.minLength(10)]],
});

constructor(private fb: FormBuilder, private http: HttpClient) {}

submitContact() {
  if (this.contactForm.invalid) {
    this.contactForm.markAllAsTouched();
    return;
  }

  this.sending = true;
  this.sentOk = false;

  this.http.post('https://kaptah-erp-production.up.railway.app/api/contact', this.contactForm.value)
    .subscribe({
      next: (res: any) => {
        this.sending = false;
        if (res.success) {
          this.sentOk = true;
          this.contactForm.reset();
        }
      },
      error: () => {
        this.sending = false;
      }
    });

  setTimeout(() => {
    this.sending = false;
    this.sentOk = true;
    this.contactForm.reset();
  }, 800);
}
switchTab(tab: string) {
  this.fade = false;
  setTimeout(() => {
    this.activeTab = tab;
    this.fade = true;
  }, 150);
}
revealOnScroll = () => {
  const elements = document.querySelectorAll('.reveal');
  const windowHeight = window.innerHeight;

  elements.forEach((el: any) => {
    const elementTop = el.getBoundingClientRect().top;
    if (elementTop < windowHeight - 120) {
      el.classList.add('active');
    }
  });
};
checkScrollTop = () => {
  this.showScrollTop = window.scrollY > 400;
};

scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

}
