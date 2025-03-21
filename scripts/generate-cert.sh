#!/usr/bin/bash

openssl req  -nodes -new -x509  \
	-keyout ./cert/server.key \
	-out ./cert/server.cert \
	-subj "/C=US/ST=State/L=City/O=company/OU=Com/CN=www.testserver.local"

# openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
#   -keyout ./cert/localhost-privkey.pem -out ./cert/localhost-cert.pem 
