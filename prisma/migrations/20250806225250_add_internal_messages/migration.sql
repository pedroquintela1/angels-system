-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ticket_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isFromUser" BOOLEAN NOT NULL DEFAULT true,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ticket_messages" ("authorId", "createdAt", "id", "isFromUser", "message", "ticketId") SELECT "authorId", "createdAt", "id", "isFromUser", "message", "ticketId" FROM "ticket_messages";
DROP TABLE "ticket_messages";
ALTER TABLE "new_ticket_messages" RENAME TO "ticket_messages";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
