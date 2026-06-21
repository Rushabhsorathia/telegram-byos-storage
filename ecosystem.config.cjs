module.exports = {
  apps: [
    {
      name: 'tg-storage-api',
      script: 'artisan',
      args: 'serve --host=0.0.0.0 --port=8000',
      interpreter: 'php',
      interpreter_args: '',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {},
    },
    {
      name: 'tg-storage-queue-telegram',
      script: 'artisan',
      // Run several parallel workers so one slow/large upload doesn't block the
      // whole queue (a single chunk can take minutes on a slow uplink). This also
      // lets the chunks of a split >1.7 GB file upload concurrently.
      instances: 3,
      exec_mode: 'fork',
      // --timeout must exceed the job timeouts (UploadChunkJob = 3600s) or long
      // large-chunk uploads get killed at the default 60s. --max-time recycles the
      // worker hourly to keep memory healthy.
      args: 'queue:work --queue=telegram --tries=3 --backoff=10,30,60 --timeout=3700 --max-time=3600 --memory=1024 --sleep=1',
      interpreter: 'php',
      interpreter_args: '-d memory_limit=1024M',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 20,
    },
    {
      name: 'tg-storage-queue-default',
      script: 'artisan',
      args: 'queue:work --queue=default --tries=3 --memory=512',
      interpreter: 'php',
      interpreter_args: '-d memory_limit=512M',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 20,
    },
    {
      name: 'tg-storage-reverb',
      script: 'artisan',
      args: 'reverb:start --host=0.0.0.0 --port=8080',
      interpreter: 'php',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'tg-storage-scheduler',
      script: 'artisan',
      args: 'schedule:work',
      interpreter: 'php',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'tg-storage-frontend',
      script: 'npm',
      args: 'run dev',
      interpreter: 'node',
      cwd: __dirname + '/frontend',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}
