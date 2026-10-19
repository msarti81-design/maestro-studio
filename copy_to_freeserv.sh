#!/bin/bash
if [ -d "/var/www" ]; then
  mkdir -p /var/www/maestro-studio
  cp -r . /var/www/maestro-studio/
  echo "Copied to /var/www/maestro-studio successfully!"
fi
