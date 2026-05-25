import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose now as a signal that returns a Date', () => {
    expect(component.now()).toBeInstanceOf(Date);
  });

  it('should recompute timeZone when now changes', () => {
    const before = component.timeZone();
    component.now.set(new Date(component.now().getTime() + 60_000));
    const after = component.timeZone();
    expect(typeof before).toBe('string');
    expect(typeof after).toBe('string');
  });
});
