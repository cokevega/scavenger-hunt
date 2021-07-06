import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SvgIconRegistryService } from 'angular-svg-icon';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-score',
  templateUrl: './score.component.html',
  styleUrls: ['./score.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ScoreComponent implements OnInit {

  id: string = "";
  score: number = 0;
  repeated: boolean = false;
  text: string = "";
  colors: Map<string, string> = new Map<string, string>();
  pointsMap: Map<string, number> = new Map<string, number>();
  paragraph: string = "";
  pointsAdded: number = 0;
  coinColor: string="";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private iconReg:SvgIconRegistryService
  ) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.params.id;
    this.colors.set(environment.id1, 'blue');
    this.colors.set(environment.id2, 'red');
    this.colors.set(environment.id3, 'gold');
    this.pointsMap.set(environment.id1, 150);
    this.pointsMap.set(environment.id2, 250);
    this.pointsMap.set(environment.id3, 500);
    this.coinColor=this.colors.get(this.id)!;
    if (localStorage.getItem('repeated')) {
      this.text = "Coin already hunted!";
      this.paragraph = "you can not score the points of a coin already hunted. Look for others to score new points.";
      this.pointsAdded = 0;
      this.repeated=true;
      localStorage.removeItem('repeated');
    } else {
      this.text = `You've caught a ${this.colors.get(this.id)} coin`;
      this.paragraph = "You have added new points to your total score. Keep playing to get more.";
      this.pointsAdded = this.pointsMap.get(this.id)!;
    }
    this.score = parseInt(localStorage.getItem('score')!);
  }

  playAgain() {
    this.router.navigate(['/game',this.id]);
  }

}
