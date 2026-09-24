import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
    // Roles
    const superAdmin = await prisma.roles.upsert({
        where: { name: "SuperAdmin" },
        update: {},
        create: { name: "SuperAdmin" },
    });
    const admin = await prisma.roles.upsert({
        where: { name: "Admin" },
        update: {},
        create: { name: "Admin" },
    });
    const normal = await prisma.roles.upsert({
        where: { name: "Normal" },
        update: {},
        create: { name: "Normal" },
    });

    // Permissions
    const permissionNames = ["manage_users", "manage_roles", "manage_permissions"];
    const permissions = [];
    for (const name of permissionNames) {
        permissions.push(
            await prisma.permissions.upsert({
                where: { name },
                update: {},
                create: { name },
            }),
        );
    }

    // Only SuperAdmin + Admin hold permissions (Normal has none)
    for (const role of [superAdmin, admin]) {
        for (const perm of permissions) {
            await prisma.role_permissions.upsert({
                where: { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
                update: {},
                create: { role_id: role.id, permission_id: perm.id },
            });
        }
    }

    // Test users (password for all: Test@12345)
    const testPassword = await argon2.hash("Test@12345", { type: argon2.argon2id });

    const testUsers = [
        { email: "superadmin@example.com", role: "SuperAdmin" },
        { email: "admin@example.com", role: "Admin" },
        { email: "user1@example.com", role: "Normal" },
        { email: "user2@example.com", role: "Normal" },
        { email: "user3@example.com", role: "Normal" },
    ];

    let seededUsers = 0;
    for (const user of testUsers) {
        const role = await prisma.roles.findUnique({ where: { name: user.role } });
        if (!role) continue;

        await prisma.users.upsert({
            where: { email: user.email },
            update: { role_id: role.id },
            create: { email: user.email, password: testPassword, role_id: role.id },
        });
        seededUsers += 1;
    }

    console.log(`Seed complete: ${3} roles, ${permissions.length} permissions, ${seededUsers} users`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());