# Installation Instructions for Nginx on Oracle Cloud VM

## Step 1: Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

## Step 2: Setup Project Directory Structure
```bash
# Create project directory
sudo mkdir -p /var/www/ravikishan-frontend
sudo mkdir -p /var/log/nginx

# Set permissions
sudo chown -R www-data:www-data /var/www/ravikishan-frontend
sudo chown -R www-data:www-data /var/log/nginx
```

## Step 3: Copy Configuration Files
```bash
# Copy nginx.conf to main configuration
sudo cp nginx.conf /etc/nginx/nginx.conf

# Copy site configuration to sites-available
sudo cp nginx-site.conf /etc/nginx/sites-available/ravikishan

# Create symlink in sites-enabled
sudo ln -sf /etc/nginx/sites-available/ravikishan /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default
```

## Step 4: Upload Frontend Build
```bash
# Copy dist directory to web root
sudo cp -r dist/* /var/www/ravikishan-frontend/

# Set permissions for uploaded files
sudo chown -R www-data:www-data /var/www/ravikishan-frontend
```

## Step 5: Test Nginx Configuration
```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 6: Set Environment Variables
Set VITE_API_URL in your production environment:

```bash
# If using systemd service
Environment="VITE_API_URL=https://your-backend-domain.com"

# Or create .env file in frontend dist directory
echo "VITE_API_URL=https://your-backend-domain.com" > /var/www/ravikishan-frontend/.env.local
```

## Optional: Configure HTTPS with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo systemctl restart nginx
```

## Verification Commands
```bash
# Check Nginx status
sudo systemctl status nginx

# Check configuration syntax
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Test site access
curl -I http://localhost/
```

## Important Notes

1. **Backend URL**: Update `VITE_API_URL` in production to your Oracle Cloud VM backend URL
2. **Firewall**: Ensure port 80 and 443 are open in Oracle Cloud VM security rules
3. **SSL Certificate**: Configure Let's Encrypt or purchase a commercial certificate for HTTPS
4. **Performance**: Adjust `worker_processes` and `worker_connections` based on your VM specs
5. **Logging**: Monitor access and error logs for troubleshooting
6. **Security**: Review and adjust CSP headers based on your specific requirements
7. **Caching**: The configuration caches static assets for 1 year and never caches index.html

## Production Security Checklist

- [ ] Set strong permissions on configuration files
- [ ] Configure HTTPS with valid SSL certificate
- [ ] Set up backup and monitoring
- [ ] Configure rate limiting if needed
- [ ] Review and adjust CSP for your specific application needs
- [ ] Set up log rotation
- [ ] Configure alerts for failed requests
- [ ] Test application with HTTPS enabled

The configuration includes:
- React SPA routing with HTML5 mode support
- API proxy to Express backend
- Comprehensive security headers
- HTTP/2 support
- Gzip compression
- Advanced caching strategies
- Health check endpoint
- Error handling with custom pages
- MIME type support
- Static asset optimization