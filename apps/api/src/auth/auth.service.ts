import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  private readonly google: OAuth2Client;
  private readonly clientId?: string;
  private readonly adminEmails: string[];

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.clientId = config.get<string>("GOOGLE_CLIENT_ID");
    this.google = new OAuth2Client(this.clientId);
    // Emails listed here get the ADMIN role on login (set via env on the host).
    this.adminEmails = (config.get<string>("ADMIN_EMAILS") || "")
      .split(",")
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
  }

  // Verifies a Google ID token (the "credential" from the front-end button),
  // then finds or creates the matching user and issues our own JWT.
  async loginWithGoogle(credential: string) {
    if (!this.clientId) {
      throw new UnauthorizedException("Google login is not configured on the server");
    }
    let payload;
    try {
      const ticket = await this.google.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException("Invalid Google token");
    }
    if (!payload?.email) throw new UnauthorizedException("Google token has no email");

    let user = await this.users.findOrCreateByGoogle({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    });

    // Promote to admin if this email is on the configured allow-list.
    const shouldBeAdmin = this.adminEmails.includes(user.email.toLowerCase());
    if (shouldBeAdmin && user.role !== "ADMIN") {
      user = await this.users.setRole(user.id, "ADMIN");
    }

    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, user: this.publicUser(user) };
  }

  async me(userId: string) {
    const user = await this.users.getById(userId);
    return this.publicUser(user);
  }

  private publicUser(u: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    xp: number;
    streakCount: number;
  }) {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      role: u.role,
      xp: u.xp,
      streakCount: u.streakCount,
    };
  }
}
