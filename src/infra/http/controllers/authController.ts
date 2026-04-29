import { NextFunction, Request, Response } from "express";
import { EnableTwoFactor } from "../../../app/usecases/enableTwoFactor";
import { LoginUser } from "../../../app/usecases/loginUser";
import { LogoutUser } from "../../../app/usecases/logoutUser";
import { LogoutAllDevices } from "../../../app/usecases/logoutAllDevices";
import { RegisterUser } from "../../../app/usecases/registerUser";
import { VerifyLoginTwoFactor } from "../../../app/usecases/verifyLoginTwoFactor";
import { RefreshToken } from "../../../app/usecases/refreshToken";
import { DisableTwoFactor } from "../../../app/usecases/disableTwoFactor";
import { TokenPayload } from "../../../app/ports/tokenProvider";
import { AuditService } from "../../../app/services/auditService";

const REFRESH_TOKEN_COOKIE = "refreshToken";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUser,
    private readonly enableTwoFactorUseCase: EnableTwoFactor,
    private readonly disableTwoFactorUseCase: DisableTwoFactor,
    private readonly loginUserUseCase: LoginUser,
    private readonly verifyLoginTwoFactorUseCase: VerifyLoginTwoFactor,
    private readonly refreshTokenUseCase: RefreshToken,
    private readonly logoutUserUseCase: LogoutUser,
    private readonly logoutAllDevicesUseCase: LogoutAllDevices,
  ) {}

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { ip, userAgent } = AuditService.extractRequestInfo({
        ip: req.ip,
        headers: req.headers as Record<string, string | string[] | undefined>,
      });
      const result = await this.registerUserUseCase.execute(req.body, {
        ip,
        userAgent,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  enableTwoFactorInit = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = (req as Request & { user?: TokenPayload }).user;
      const result = await this.enableTwoFactorUseCase.init({
        userId: user!.userId,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  enableTwoFactorConfirm = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = (req as Request & { user?: TokenPayload }).user;
      const result = await this.enableTwoFactorUseCase.confirm({
        ...req.body,
        userId: user!.userId,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { output, refreshToken } = await this.loginUserUseCase.execute(
        req.body,
      );
      if (output.status === "SUCCESS" && refreshToken) {
        res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
      }
      res.status(output.status === "REQUIRE_2FA" ? 202 : 200).json(output);
    } catch (error) {
      next(error);
    }
  };

  verifyLoginTwoFactor = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { output, refreshToken } =
        await this.verifyLoginTwoFactorUseCase.execute(req.body);
      res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
      res.status(200).json(output);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const refreshToken =
        req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;
      if (!refreshToken) {
        res
          .status(401)
          .json({
            error: {
              message: "Refresh token missing",
              code: "REFRESH_TOKEN_MISSING",
            },
          });
        return;
      }
      const result = await this.refreshTokenUseCase.execute(refreshToken);
      res.cookie(REFRESH_TOKEN_COOKIE, result.newRefreshToken, COOKIE_OPTIONS);
      res.status(200).json({ accessToken: result.accessToken });
    } catch (error) {
      next(error);
    }
  };

  disableTwoFactor = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = (req as Request & { user?: TokenPayload }).user;
      const result = await this.disableTwoFactorUseCase.execute({
        ...req.body,
        userId: user!.userId,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(" ")[1] ?? "";
      const user = (req as Request & { user?: TokenPayload }).user;
      const result = await this.logoutUserUseCase.execute(
        user?.userId ?? "",
        user?.email ?? "",
        accessToken,
      );
      res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  logoutAllDevices = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = (req as Request & { user?: TokenPayload }).user;
      const result = await this.logoutAllDevicesUseCase.execute(
        user?.userId ?? "",
        user?.email ?? "",
      );
      res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
