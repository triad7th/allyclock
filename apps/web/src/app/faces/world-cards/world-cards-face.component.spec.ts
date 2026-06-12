import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WorldCardsFaceComponent } from './world-cards-face.component';

describe('WorldCardsFaceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorldCardsFaceComponent],
    }).compileComponents();
  });

  it('renders the US, UK, and KR cards', () => {
    const fixture = TestBed.createComponent(WorldCardsFaceComponent);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('app-card');
    expect(cards).toHaveLength(3);
  });
});
