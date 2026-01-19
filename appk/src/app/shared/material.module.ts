import { NgModule } from '@angular/core';

// Importaciones de Angular Material
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LayoutModule } from '@angular/cdk/layout';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatStepperModule } from '@angular/material/stepper';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { MatSliderModule } from '@angular/material/slider';
import { MatTreeModule } from '@angular/material/tree';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkTreeModule } from '@angular/cdk/tree';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { A11yModule } from '@angular/cdk/a11y';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { PortalModule } from '@angular/cdk/portal';
import { OverlayModule } from '@angular/cdk/overlay';
import { FormsModule } from '@angular/forms';
// Importaciones de módulos de terceros relacionados
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

const materialModules = [
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatInputModule,
  MatFormFieldModule,
  MatButtonModule,
  MatIconModule,
  MatMenuModule,
  MatChipsModule,
  MatDialogModule,
  MatSelectModule,
  MatCardModule,
  MatSidenavModule,
  MatToolbarModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatTabsModule,
  MatAutocompleteModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatSnackBarModule,
  MatTooltipModule,
  MatSlideToggleModule,
  MatCheckboxModule,
  MatListModule,
  MatGridListModule,
  MatStepperModule,
  MatExpansionModule,
  MatRadioModule,
  MatBadgeModule,
  MatBottomSheetModule,
  MatButtonToggleModule,
  MatDividerModule,
  MatRippleModule,
  MatSliderModule,
  MatTreeModule,
  DragDropModule,
  CdkTableModule,
  CdkTreeModule,
  ScrollingModule,
  A11yModule,
  ClipboardModule,
  PortalModule,
  OverlayModule,
  LayoutModule,
  FormsModule
];

@NgModule({
  imports: [
    ...materialModules,
    NgxMatSelectSearchModule
  ],
  exports: [
    ...materialModules,
    NgxMatSelectSearchModule
  ]
})
export class MaterialModule { }