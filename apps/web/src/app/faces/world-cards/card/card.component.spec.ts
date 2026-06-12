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

  it('exposes the shared clock as a Date signal', () => {
    expect(component.now()).toBeInstanceOf(Date);
  });

  it('derives a DatePipe-compatible timezone offset', () => {
    expect(component.timeZone()).toMatch(/^[+-]\d{2}:\d{2}$/);
  });

  it('renders the flag for the configured region', () => {
    fixture.componentRef.setInput('state', 'KR');
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain('SOUTH_KOREA');
  });
});
