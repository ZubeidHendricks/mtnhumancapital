import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function verifyUser() {
  try {
    console.log("Looking for user: admin@fleetlogix.co.za");

    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin@fleetlogix.co.za"))
      .limit(1);

    if (user.length === 0) {
      console.log("❌ User not found!");
      process.exit(1);
    }

    console.log("\n✅ User found:");
    console.log("  ID:", user[0].id);
    console.log("  Username:", user[0].username);
    console.log("  Tenant ID:", user[0].tenantId);
    console.log("  Role:", user[0].role);
    console.log("  Is Super Admin:", user[0].isSuperAdmin);

    // Test password verification
    const testPassword = "admin123";
    const isValid = await bcrypt.compare(testPassword, user[0].password);

    console.log("\n🔑 Password Test:");
    console.log("  Testing password: admin123");
    console.log("  Result:", isValid ? "✅ VALID" : "❌ INVALID");

    if (!isValid) {
      console.log("\n⚠️ Password doesn't match! Resetting to admin123...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, "admin@fleetlogix.co.za"));
      console.log("✅ Password reset complete!");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

verifyUser();
