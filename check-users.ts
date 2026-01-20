import { config } from "dotenv";
config();

import { db } from "./server/db";
import { users } from "@shared/schema";

async function checkUsers() {
  const allUsers = await db.select().from(users);
  console.log('Users in database:', allUsers.length);
  allUsers.forEach(user => {
    console.log(`- ${user.username} (${user.email}) - role: ${user.role}`);
  });
}

checkUsers().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
