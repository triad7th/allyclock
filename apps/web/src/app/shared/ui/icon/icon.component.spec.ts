import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconComponent, SfSymbol } from './icon.component';

@Component({
  standalone: true,
  imports: [IconComponent],
  template: '<app-icon [name]="name" />',
})
class HostComponent {
  name: SfSymbol = 'pencil';
}

describe('IconComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  function render(name: string): SVGElement | null {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.name = name as SfSymbol;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('svg');
  }

  it('renders an svg for a known name', () => {
    const svg = render('pencil');
    expect(svg).toBeTruthy();
    expect(svg!.querySelector('path')).toBeTruthy();
  });

  it('renders each supported SF Symbol name', () => {
    for (const name of [
      'pencil',
      'photo',
      'plus',
      'trash',
      'square.and.arrow.up',
      'square.on.square',
      'xmark',
      'checkmark',
      'gearshape',
      'arrow.right',
      'arrow.clockwise',
    ]) {
      expect(render(name)!.querySelector('path')).toBeTruthy();
    }
  });

  it('renders an empty svg (no path) for an unknown name', () => {
    const svg = render('does.not.exist');
    expect(svg).toBeTruthy();
    expect(svg!.querySelector('path')).toBeNull();
  });
});

describe('IconComponent icon set', () => {
  function render(name: string): SVGPathElement | null {
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', name as SfSymbol);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('path');
  }

  it('renders a non-empty path for the new screen/nav icons', () => {
    for (const name of ['chevron.left', 'chevron.right', 'clock.arrow.circlepath', 'clock']) {
      const path = render(name);
      expect(path, name).toBeTruthy();
      expect(path!.getAttribute('d')!.length, name).toBeGreaterThan(0);
    }
  });
});
