# Per-repo fleet start config for disk-usage-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'disk-usage-mcp'
    BackendPort  = 11114
    FrontendPort = 11115
    HealthPath   = '/health'
    WebRoot      = 'web_sota'
    Backend = @{
        Kind          = 'uvicorn-web-app'
        UvicornTarget = 'disk_usage_mcp.http_app:app'
        SyncExtras    = @('dev')
        Env           = @{ WEB_PORT = '11114' }
    }
    Frontend = @{
        Kind           = 'vite-bun'
        PackageManager = 'bun'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
