-- CreateTable
CREATE TABLE "note" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "iv" VARCHAR(24) NOT NULL,
    "tag" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_pkey" PRIMARY KEY ("id")
);
