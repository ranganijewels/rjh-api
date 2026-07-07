#!/bin/bash
echo "Generating RSA key pair for JWT RS256..."
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
echo ""
echo "Add these to your .env:"
echo "JWT_PRIVATE_KEY=\"$(awk '{printf "%s\\n", $0}' private.pem)\""
echo "JWT_PUBLIC_KEY=\"$(awk '{printf "%s\\n", $0}' public.pem)\""
rm private.pem public.pem
