# template-js-koa-nedb-hbs

This is an opinionated template TODO...

## Features

* JSON-like database with subset of MongoDB's API via [NeDB](https://github.com/louischatriot/nedb)
* Layered architecture in 1-file (`index.js`)
* Live-reload _for `.js` and `.hbs` files_

## Getting Started

1. Click "Use this template" button to get your own copy

1. Clone your newly created repository to your computer

1. Create certificate;

   ```bash
   cd /path/to/cloned/repository
   chmod +x ./cert/create_cert.sh
   cd cert
   ./create_cert.sh YOUR_PROJECT_NAME
   ls # create_cert.sh YOUR_PROJECT_NAME.localhost.crt  YOUR_PROJECT_NAME.localhost.key
   cd ..
   ```

1. Move `.data/users.sample` to `.data/users`
