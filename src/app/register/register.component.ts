import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  name: FormControl = new FormControl('', Validators.required);
  lastName: FormControl = new FormControl('');
  email: FormControl = new FormControl('', [Validators.required, Validators.email]);
  terms: FormControl = new FormControl('', [Validators.required,Validators.requiredTrue]);

  nameError: boolean = false;
  emailError: boolean = false;
  termsError: boolean = false;

  constructor() {

  }

  ngOnInit(): void {
    if (localStorage.getItem('email')) this.email.setValue(localStorage.getItem('email'));
    if (localStorage.getItem('name')) this.name.setValue(localStorage.getItem('name'));
    if (localStorage.getItem('lastName')) this.lastName.setValue(localStorage.getItem('lastName'));
  }

  validateForm() {
    this.emailError = false;
    this.nameError = false;
    this.termsError = false;
    if (this.email.invalid) {
      this.emailError = true;
      return;
    }
    if (this.name.invalid) {
      this.nameError = true;
      return;
    }
    if (this.terms.invalid) {
      this.termsError = true;
      return;
    }
    if(localStorage.getItem('name')) {

    }
    else {
      localStorage.setItem('email',this.email.value);
      localStorage.setItem('name',this.name.value);
      localStorage.setItem('lastName',this.lastName.value);
      localStorage.setItem('score','0');
    }
  }

}
