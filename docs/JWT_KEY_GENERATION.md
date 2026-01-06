# JWT RSA Key Pair Generation

This document describes how to generate RSA key pairs for JWT token signing and verification using the RS256 algorithm.

## Overview

The application uses RS256 (RSA Signature with SHA-256) for JWT authentication, which requires:
- **Private Key**: Used to sign JWT tokens (keep this secret!)
- **Public Key**: Used to verify JWT token signatures (can be shared)

## Key Generation

### Using OpenSSL

#### Generate RSA-2048 Key Pair (Recommended Minimum)

```bash
# Generate RSA-2048 private key
openssl genrsa -out jwt-private.pem 2048

# Extract public key from private key
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
```

#### Generate RSA-4096 Key Pair (More Secure, Larger Key Size)

```bash
# Generate RSA-4096 private key
openssl genrsa -out jwt-private.pem 4096

# Extract public key from private key
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
```

### Key Format

Both keys must be in PEM format:

**Private Key Format:**
```
-----BEGIN RSA PRIVATE KEY-----
[Base64 encoded key data]
-----END RSA PRIVATE KEY-----
```

**Public Key Format:**
```
-----BEGIN PUBLIC KEY-----
[Base64 encoded key data]
-----END PUBLIC KEY-----
```

## Environment Variables

Set the following environment variables with the generated keys:

```bash
# RSA Private Key (PEM format) - Keep this SECRET!
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
[full key content]
...
-----END RSA PRIVATE KEY-----"

# RSA Public Key (PEM format) - Can be shared
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...
[full key content]
...
-----END PUBLIC KEY-----"
```

**Note:** The old `JWT_SECRET` environment variable has been removed. The application now exclusively uses RSA key pairs (`JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`) for RS256 authentication.

### For Docker/Environment Files

When using `.env` files or Docker, you can use multi-line strings or escape newlines:

```bash
# Option 1: Single line with \n escape sequences
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"

# Option 2: Read from file (recommended for production)
JWT_PRIVATE_KEY=$(cat jwt-private.pem)
JWT_PUBLIC_KEY=$(cat jwt-public.pem)
```

## Security Best Practices

1. **Never commit keys to version control**
   - Add `*.pem` to `.gitignore`
   - Never commit `.env` files containing keys
   - Use secrets management services in production

2. **Private Key Protection**
   - Store private key in secure secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Never log the private key
   - Never expose the private key in error messages
   - Use file system permissions: `chmod 600 jwt-private.pem`

3. **Public Key Sharing**
   - Public key can be safely shared
   - Can be distributed to services that need to verify tokens
   - Can be included in API documentation or JWKS endpoints

4. **Key Rotation**
   - Implement a key rotation strategy for production
   - Generate new key pairs periodically
   - Support multiple keys during rotation period
   - Old tokens will become invalid after rotation (users must re-authenticate)

5. **Key Size Recommendations**
   - **RSA-2048**: Minimum recommended for production (good balance of security and performance)
   - **RSA-4096**: Higher security, larger key size (slower signing/verification)

## Verification

To verify your keys are correctly formatted:

```bash
# Verify private key
openssl rsa -in jwt-private.pem -check -noout

# View public key
openssl rsa -in jwt-private.pem -pubout

# Verify public key matches
diff <(openssl rsa -in jwt-private.pem -pubout) jwt-public.pem
```

## Testing

For local development and testing, you can generate test keys:

```bash
# Generate test keys
openssl genrsa -out test-jwt-private.pem 2048
openssl rsa -in test-jwt-private.pem -pubout -out test-jwt-public.pem

# Set in your .env file
JWT_PRIVATE_KEY=$(cat test-jwt-private.pem)
JWT_PUBLIC_KEY=$(cat test-jwt-public.pem)
```

## Troubleshooting

### Common Issues

1. **Invalid key format**: Ensure keys are in PEM format with proper headers/footers
2. **Newline issues**: When setting environment variables, ensure newlines are preserved or escaped
3. **Key mismatch**: Private and public keys must be from the same key pair
4. **Algorithm mismatch**: Ensure `algorithm: 'RS256'` is set in JWT configuration

### Validation

The application validates keys on startup:
- Keys must be present (required environment variables)
- Keys must match PEM format pattern
- Configuration schema will reject invalid keys

## Migration from HS256

When migrating from HS256 (symmetric) to RS256 (asymmetric):

1. Generate new RSA key pair
2. Set `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` environment variables
3. Remove old `JWT_SECRET` environment variable (no longer used)
4. Deploy updated application
5. **Note**: All existing HS256 tokens will be invalidated
6. Users will need to re-authenticate to receive new RS256 tokens

## References

- [NestJS JWT Documentation](https://docs.nestjs.com/security/authentication#jwt-functionality)
- [RFC 7518: JSON Web Algorithms (JWA)](https://tools.ietf.org/html/rfc7518)
- [OpenSSL Documentation](https://www.openssl.org/docs/)

