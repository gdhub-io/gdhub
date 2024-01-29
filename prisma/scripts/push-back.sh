#!/bin/sh

. ./.env

npx prisma migrate diff  --from-schema-datamodel prisma/schema.prisma  --to-migrations prisma/migrations  --shadow-database-url $POSTGRES_SHADOW_URL --script > prisma/backward.sql
echo "Push back query in ${PWD}/backward.sql"

if [ "$1" = "--exec" ]; then
  npx prisma db execute --file prisma/backward.sql --schema prisma/schema.prisma
  rm prisma/backward.sql
  echo "Push was back. The prisma/backward.sql file was deleted"
fi