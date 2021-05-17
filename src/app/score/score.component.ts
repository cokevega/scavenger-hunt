import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-score',
  templateUrl: './score.component.html',
  styleUrls: ['./score.component.css']
})
export class ScoreComponent implements OnInit {

  score:number=0;
  repeated:boolean=false;
  title:string='Congratulations!'
  text:string="Looking for your first coin to increase your score";

  constructor() {
    if(localStorage.getItem('repeated')) {
      this.repeated=true;
      this.title="You had already collected this coin";
    }
    if(parseInt(localStorage.getItem('score')||'0')!==0) {
      this.score=parseInt(localStorage.getItem('score')!);
      this.text=`Your total score is ${this.score}`;
    }
    localStorage.removeItem('repeated');
  }

  ngOnInit(): void {
  }

}
