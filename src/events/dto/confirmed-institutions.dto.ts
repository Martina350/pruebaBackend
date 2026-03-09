export class ConfirmedInstitutionItemDto {
  schoolName: string;
  students: number;
}

export class ConfirmedInstitutionsResponseDto {
  day: string;
  time: string;
  institutions: ConfirmedInstitutionItemDto[];
}
