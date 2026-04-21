export interface RegisterUserInputDto {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterUserOutputDto {
  id: string;
  fullName: string;
  email: string;
  isTwoFactorEnabled: boolean;
}

export interface EnableTwoFactorInitInputDto {
  userId: string;
}

export interface EnableTwoFactorInitOutputDto {
  qrCodeDataUrl: string;
  manualEntryKey: string;
  setupToken: string;
}

export interface EnableTwoFactorConfirmInputDto {
  userId: string;
  code: string;
  setupToken: string;
}

export interface EnableTwoFactorConfirmOutputDto {
  message: string;
  isTwoFactorEnabled: boolean;
}

export interface LoginUserInputDto {
  email: string;
  password: string;
}

export interface LoginUserSuccessOutputDto {
  status: "SUCCESS";
  accessToken: string;
}

export interface LoginUserRequireTwoFactorOutputDto {
  status: "REQUIRE_2FA";
  challengeId: string;
  userId: string;
  email: string;
  message: string;
}

export type LoginUserOutputDto = LoginUserSuccessOutputDto | LoginUserRequireTwoFactorOutputDto;

export interface VerifyLoginTwoFactorInputDto {
  challengeId: string;
  email: string;
  code: string;
}

export interface VerifyLoginTwoFactorOutputDto {
  accessToken: string;
}
