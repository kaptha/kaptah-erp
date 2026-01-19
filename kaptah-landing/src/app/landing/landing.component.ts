import { Component, ViewEncapsulation } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LandingComponent {
  activeTab = 'freelancer';
  fade = false;
  ngOnInit() {
  window.addEventListener('scroll', this.revealOnScroll);
}
contactEmail = 'contacto@kaptah.com';
contactPhone = '+52 000 000 0000';

sending = false;
sentOk = false;

contactForm = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(2)]],
  email: ['', [Validators.required, Validators.email]],
  phone: [''],
  subject: ['', [Validators.required, Validators.minLength(3)]],
  message: ['', [Validators.required, Validators.minLength(10)]],
});

constructor(private fb: FormBuilder) {}

submitContact() {
  if (this.contactForm.invalid) {
    this.contactForm.markAllAsTouched();
    return;
  }

  this.sending = true;
  this.sentOk = false;

  // TODO: aquí conectas a tu endpoint real (biz-entities-api/email/send o un contact endpoint)
  // Ejemplo: this.http.post('/api/contact', this.contactForm.value).subscribe(...)

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

}
