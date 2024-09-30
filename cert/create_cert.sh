#!/usr/bin/env bash

# https://letsencrypt.org/docs/certificates-for-localhost/#making-and-trusting-your-own-certificates

openssl req -x509 -out $1.localhost.crt -keyout $1.localhost.key \
  -newkey rsa:2048 -nodes -sha256 \
  -subj "/CN=$1.localhost" -extensions EXT -config <( \
   printf "[dn]\nCN=$1.localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:$1.localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
