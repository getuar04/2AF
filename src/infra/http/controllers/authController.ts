import { NextFunction, Request, Response } from "express";
import { EnableTwoFactor } from "../../../app/usecases/enableTwoFactor";
import { LoginUser } from "../../../app/usecases/loginUser";
import { RegisterUser } from "../../../app/usecases/registerUser";
import { VerifyLoginTwoFactor } from "../../../app/usecases/verifyLoginTwoFactor";
import { RefreshToken } from "../../../app/usecases/refreshToken";

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUser,
    private readonly enableTwoFactorUseCase: EnableTwoFactor,
    private readonly loginUserUseCase: LoginUser,
    private readonly verifyLoginTwoFactorUseCase: VerifyLoginTwoFactor,
    private readonly refreshTokenUseCase: RefreshToken
  ) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.registerUserUseCase.execute(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  enableTwoFactorInit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.enableTwoFactorUseCase.init(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  enableTwoFactorConfirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.enableTwoFactorUseCase.confirm(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.loginUserUseCase.execute(req.body);
      res.status(result.status === "REQUIRE_2FA" ? 202 : 200).json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyLoginTwoFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.verifyLoginTwoFactorUseCase.execute(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.refreshTokenUseCase.execute(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
