import { Controller, Get, Param } from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Dev helper: get-or-create the demo user (real auth arrives in phase 3).
  @Get("demo")
  demo() {
    return this.users.ensureDemoUser();
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.users.getById(id);
  }
}
