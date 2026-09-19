[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "status",
        "build-terrain-core",
        "terrain-scan",
        "terrain-refresh",
        "terrain-overview",
        "terrain-freshness",
        "terrain-grep",
        "litho-smoke",
        "terrain-litho-smoke",
        "terrain-litho"
    )]
    [string]$Action = "status",

    [string]$Query = "CreditLedgerEntry|creditBalance|creditsExpireAt|AdminTransaction",
    [string]$Project = "saad-studio",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $PSCommandPath
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
$localRoot = Join-Path $repoRoot ".repository-intelligence"
$terrainSource = if ($env:SAAD_TERRAIN_SOURCE) {
    $env:SAAD_TERRAIN_SOURCE
} else {
    "E:\saad-agent\release-production-v4\terrain-main\terrain-main"
}
$lithoSource = if ($env:SAAD_LITHO_SOURCE) {
    $env:SAAD_LITHO_SOURCE
} else {
    "E:\saad-agent\release-production-v4\deepwiki-rs-main\deepwiki-rs-main"
}
$terrainBridgeManifest = Join-Path $scriptDir "terrain-core-cli\Cargo.toml"
$terrainTarget = Join-Path $localRoot "bin\terrain-core"
$terrainBinary = Join-Path $terrainTarget "release\terrain-core-bridge.exe"
$lithoBinary = if ($env:SAAD_LITHO_BINARY) {
    $env:SAAD_LITHO_BINARY
} else {
    Join-Path $lithoSource "target\release\deepwiki-rs.exe"
}
$lithoConfig = Join-Path $scriptDir "litho.toml"
$providerPolicyPath = Join-Path $scriptDir "provider-policy.json"
$lithoRoot = Join-Path $localRoot "litho"
$lithoCache = Join-Path $lithoRoot "cache"

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required local command '$Name' is unavailable. Install it and retry; the web application is unchanged."
    }
}

function Assert-Source([string]$Name, [string]$Path) {
    if (-not (Test-Path -LiteralPath (Join-Path $Path "Cargo.toml") -PathType Leaf)) {
        throw "$Name source was not found at '$Path'. Set the corresponding SAAD_*_SOURCE environment variable and retry."
    }
}

function Assert-Binary([string]$Name, [string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Name binary is unavailable at '$Path'. Build the approved local development tool and retry."
    }
}

function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Local repository-intelligence command failed with exit code $LASTEXITCODE. The web application was not modified."
    }
}

function Invoke-Captured([string]$Executable, [string[]]$Arguments) {
    $output = & $Executable @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Local repository-intelligence command failed with exit code $LASTEXITCODE. The web application was not modified.`n$($output -join "`n")"
    }
    return ($output -join "`n")
}

function Initialize-TerrainEnvironment {
    Assert-Binary "Terrain core bridge" $terrainBinary
    New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
    $env:TERRAIN_REGISTRY_FILE = Join-Path $localRoot "terrain-registry.json"
    $env:TERRAIN_REPO_PATH = $repoRoot
}

function Build-TerrainCoreBridge {
    Assert-Command "cargo"
    Assert-Source "Terrain" $terrainSource
    New-Item -ItemType Directory -Force -Path $terrainTarget | Out-Null
    Invoke-Checked "cargo" @(
        "build", "--release",
        "--manifest-path", $terrainBridgeManifest,
        "--target-dir", $terrainTarget
    )
    Assert-Binary "Terrain core bridge" $terrainBinary
}

function Invoke-TerrainJson([string]$TerrainAction, [string[]]$Extra = @()) {
    Initialize-TerrainEnvironment
    $arguments = @($TerrainAction, $repoRoot, $Project) + $Extra
    $json = Invoke-Captured $terrainBinary $arguments
    return ($json | ConvertFrom-Json)
}

function Invoke-TerrainTargetJson(
    [string]$TerrainAction,
    [string]$RepositoryPath,
    [string]$TerrainProject,
    [string[]]$Extra = @()
) {
    Initialize-TerrainEnvironment
    $env:TERRAIN_REPO_PATH = $RepositoryPath
    $arguments = @($TerrainAction, $RepositoryPath, $TerrainProject) + $Extra
    $json = Invoke-Captured $terrainBinary $arguments
    return ($json | ConvertFrom-Json)
}

function Get-OptionalProperty([object]$Object, [string]$Name) {
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function Get-ProviderPolicy {
    $policy = Get-Content -LiteralPath $providerPolicyPath -Raw | ConvertFrom-Json
    if ($policy.provider -ne "gemini") {
        throw "Repository Intelligence policy only permits the Gemini provider."
    }
    if ($policy.model_efficient -ne "gemini-3.5-flash-lite" -or
        $policy.model_powerful -ne "gemini-3.5-flash-lite") {
        throw "Repository Intelligence policy only permits gemini-3.5-flash-lite."
    }
    if ($policy.fallback_to_another_model -ne $false) {
        throw "Fallback to another model must remain disabled."
    }
    return $policy
}

function Get-GoogleApiKey {
    if (-not [string]::IsNullOrWhiteSpace($env:GOOGLE_API_KEY)) {
        return $env:GOOGLE_API_KEY
    }

    foreach ($envFileName in @(".env.local", ".env")) {
        $envPath = Join-Path $repoRoot $envFileName
        if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
            continue
        }
        $line = Get-Content -LiteralPath $envPath | Where-Object {
            $_ -match '^\s*GOOGLE_API_KEY\s*='
        } | Select-Object -First 1
        if ($line) {
            $value = ($line -replace '^\s*GOOGLE_API_KEY\s*=\s*', '').Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            if (-not [string]::IsNullOrWhiteSpace($value)) {
                return $value
            }
        }
    }

    throw "GOOGLE_API_KEY was not found in the server environment. No key was created or copied."
}

function Get-TerrainSignature {
    $head = (git -C $repoRoot rev-parse HEAD).Trim()
    $trackedChanges = @(git -C $repoRoot status --porcelain=v1 --untracked-files=no) -join "`n"
    $text = "$head`n$trackedChanges"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Ensure-TerrainIndex {
    $packPath = Join-Path $repoRoot ".terrain\agent\repomix.md"
    $statePath = Join-Path $localRoot "cache\terrain-state.json"
    $signature = Get-TerrainSignature
    $state = $null
    if (Test-Path -LiteralPath $statePath -PathType Leaf) {
        try { $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json } catch { $state = $null }
    }

    $mustScan = $Force -or -not (Test-Path -LiteralPath $packPath -PathType Leaf) -or
        $null -eq $state -or $state.signature -ne $signature
    if ($mustScan) {
        $report = Invoke-TerrainJson "scan"
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $statePath) | Out-Null
        [pscustomobject]@{
            signature = $signature
            scanned_at = [DateTimeOffset]::UtcNow.ToString("O")
            project = $Project
            files_written = $report.files_written
            pack_files = $report.agent_pack.total_files
            pack_tokens = $report.agent_pack.total_tokens
        } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statePath -Encoding utf8NoBOM
    }

    return Invoke-TerrainJson "freshness"
}

function Get-SafeTerrainFiles([object[]]$Hits) {
    $allowedExtensions = @(".ts", ".tsx", ".js", ".mjs", ".json", ".prisma", ".sql")
    $files = New-Object System.Collections.Generic.List[string]
    foreach ($hit in $Hits) {
        if ([string]::IsNullOrWhiteSpace([string]$hit.file_path)) { continue }
        $relative = ([string]$hit.file_path).Replace('/', [IO.Path]::DirectorySeparatorChar)
        if ($relative -match '(^|[\\/])\.env' -or $relative -match 'node_modules|\.next|\.terrain|\.repository-intelligence') { continue }
        $candidate = Join-Path $repoRoot $relative
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        if ($allowedExtensions -notcontains [IO.Path]::GetExtension($candidate).ToLowerInvariant()) { continue }
        $resolved = (Resolve-Path -LiteralPath $candidate).Path
        if (-not $resolved.StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase)) { continue }
        if (-not $files.Contains($relative)) { $files.Add($relative) }
        if ($files.Count -ge 5) { break }
    }
    return @($files)
}

function Get-PrismaSubset {
    $schemaPath = Join-Path $repoRoot "prisma\schema.prisma"
    $schema = Get-Content -LiteralPath $schemaPath -Raw
    $sections = New-Object System.Collections.Generic.List[string]
    foreach ($header in @("generator client", "datasource db")) {
        $match = [regex]::Match($schema, "(?ms)^$([regex]::Escape($header))\s*\{.*?^\}")
        if ($match.Success) { $sections.Add($match.Value.Trim()) }
    }
    foreach ($name in @("UserSubscription", "User", "Generation", "UserProfile", "CreditLedgerEntry", "GenerationRequestSnapshot", "AdminTransaction")) {
        $match = [regex]::Match($schema, "(?ms)^model\s+$([regex]::Escape($name))\s*\{.*?^\}")
        if ($match.Success) { $sections.Add($match.Value.Trim()) }
    }
    return ($sections -join "`n`n") + "`n"
}

function Get-ContentFingerprint([string[]]$Files, [string]$TerrainContext, [object]$Policy) {
    $builder = New-Object System.Text.StringBuilder
    foreach ($relative in ($Files | Sort-Object -Unique)) {
        $path = Join-Path $repoRoot $relative
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
            [void]$builder.AppendLine("$relative=$hash")
        }
    }
    [void]$builder.AppendLine($TerrainContext)
    [void]$builder.AppendLine(($Policy | ConvertTo-Json -Compress))
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($builder.ToString())
    return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant().Substring(0, 16)
}

function New-TargetedSubset(
    [string]$Scope,
    [string[]]$Files,
    [string]$TerrainContext,
    [object]$Policy
) {
    $safeFiles = @($Files | Sort-Object -Unique | Where-Object {
        $_ -and $_ -notmatch '(^|[\\/])\.env' -and $_ -notmatch 'node_modules|\.next|\.terrain|\.repository-intelligence'
    })
    $fingerprint = Get-ContentFingerprint $safeFiles $TerrainContext $Policy
    $subsetRoot = Join-Path $localRoot "subsets\$Scope\$fingerprint"
    New-Item -ItemType Directory -Force -Path $subsetRoot | Out-Null

    foreach ($relative in $safeFiles) {
        if ($relative -eq "prisma\schema.prisma" -or $relative -eq "prisma/schema.prisma") { continue }
        $source = Join-Path $repoRoot $relative
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
        $resolved = (Resolve-Path -LiteralPath $source).Path
        if (-not $resolved.StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Targeted context path escaped the repository root: $relative"
        }
        $destination = Join-Path $subsetRoot $relative
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
        Copy-Item -LiteralPath $resolved -Destination $destination -Force
    }

    $prismaDestination = Join-Path $subsetRoot "prisma\schema.prisma"
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $prismaDestination) | Out-Null
    Get-PrismaSubset | Set-Content -LiteralPath $prismaDestination -Encoding utf8NoBOM

    $contextDocument = @"
# Targeted Terrain Context

This development-only subset was selected for a bounded architecture verification.

- Terrain project: $Project
- Query: $Query
- Source fingerprint: $fingerprint
- Selected files: $($safeFiles -join ', ')

## Terrain freshness and selection evidence

$TerrainContext
"@
    Set-Content -LiteralPath (Join-Path $subsetRoot "TERRAIN_CONTEXT.md") -Value $contextDocument -Encoding utf8NoBOM

    return [pscustomobject]@{
        Scope = $Scope
        Fingerprint = $fingerprint
        Root = $subsetRoot
        Files = $safeFiles
    }
}

function New-LithoRuntimeConfig([string]$Scope, [string]$Fingerprint) {
    $runtimeDir = Join-Path $lithoRoot "runtime\$Scope\$Fingerprint"
    New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
    $runtimeConfig = Join-Path $runtimeDir "litho.toml"
    $configText = Get-Content -LiteralPath $lithoConfig -Raw
    $configText = $configText -replace '(?m)^git_tracked_only\s*=\s*true\s*$', 'git_tracked_only = false'
    $cacheTomlPath = $lithoCache.Replace('\', '/')
    $configText = $configText -replace '(?m)^cache_dir\s*=.*$', "cache_dir = `"$cacheTomlPath`""
    Set-Content -LiteralPath $runtimeConfig -Value $configText -Encoding utf8NoBOM
    return $runtimeConfig
}

function New-SyntheticSmokeSubset([object]$Policy) {
    $files = [ordered]@{
        "package.json" = @'
{
  "name": "repository-intelligence-smoke-fixture",
  "private": true,
  "scripts": { "test": "node --test" }
}
'@
        "prisma\schema.prisma" = @'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id        String        @id @default(cuid())
  email     String        @unique
  projects  Project[]
  credits   CreditEntry[]
  createdAt DateTime      @default(now())
}

model Project {
  id        String   @id @default(cuid())
  name      String
  accountId String
  account   Account  @relation(fields: [accountId], references: [id])
  createdAt DateTime @default(now())
}

model CreditEntry {
  id        String   @id @default(cuid())
  accountId String
  delta     Int
  reason    String
  account   Account  @relation(fields: [accountId], references: [id])
  createdAt DateTime @default(now())
}
'@
        "database\schema.sql" = @'
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_entries (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
'@
        "src\credit-service.ts" = @'
export type CreditPort = {
  append(accountId: string, delta: number, reason: string): Promise<void>;
};

export class CreditService {
  constructor(private readonly ledger: CreditPort) {}

  async grant(accountId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new Error("amount must be positive");
    await this.ledger.append(accountId, amount, "manual grant");
  }
}
'@
        "src\admin-route.ts" = @'
import { CreditService } from "./credit-service";

export async function grantCredits(
  service: CreditService,
  accountId: string,
  amount: number,
) {
  await service.grant(accountId, amount);
  return { ok: true };
}
'@
        "README.md" = @'
# Repository Intelligence Smoke Fixture

This synthetic project contains an admin entry point, a credit service, and a small relational schema. It exists only to verify local Terrain indexing and Litho architecture generation without sending production repository code.
'@
    }

    $builder = New-Object System.Text.StringBuilder
    foreach ($entry in $files.GetEnumerator()) {
        [void]$builder.AppendLine($entry.Key)
        [void]$builder.AppendLine($entry.Value)
    }
    [void]$builder.AppendLine(($Policy | ConvertTo-Json -Compress))
    $bytes = [Text.Encoding]::UTF8.GetBytes($builder.ToString())
    $fingerprint = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant().Substring(0, 16)
    $root = Join-Path $localRoot "fixtures\litho-safe\$fingerprint"
    foreach ($entry in $files.GetEnumerator()) {
        $destination = Join-Path $root $entry.Key
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
        Set-Content -LiteralPath $destination -Value $entry.Value -Encoding utf8NoBOM
    }
    return [pscustomobject]@{
        Scope = "litho-smoke-safe"
        Fingerprint = $fingerprint
        Root = $root
        Files = @($files.Keys)
    }
}

function Get-NewCacheUsage([System.Collections.Generic.HashSet[string]]$Before) {
    $inputTokens = 0L
    $outputTokens = 0L
    $structuredEntries = 0
    if (-not (Test-Path -LiteralPath $lithoCache -PathType Container)) {
        return [pscustomobject]@{ input_tokens = 0; output_tokens = 0; structured_entries = 0; new_entries = 0 }
    }
    $newEntries = 0
    foreach ($file in Get-ChildItem -LiteralPath $lithoCache -Recurse -File -Filter "*.json") {
        if ($Before.Contains($file.FullName)) { continue }
        try {
            $entry = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
            if ($entry.token_usage) {
                $inputTokens += [long]$entry.token_usage.input_tokens
                $outputTokens += [long]$entry.token_usage.output_tokens
            }
            if ($entry.data -is [pscustomobject] -or $entry.data -is [array]) { $structuredEntries++ }
            $newEntries++
        } catch { }
    }
    return [pscustomobject]@{
        input_tokens = $inputTokens
        output_tokens = $outputTokens
        structured_entries = $structuredEntries
        new_entries = $newEntries
    }
}

function Invoke-LithoSubset([object]$Subset, [object]$Policy) {
    Assert-Binary "Litho" $lithoBinary
    $mermaidFixer = Get-Command "mermaid-fixer" -ErrorAction SilentlyContinue

    $outputDir = Join-Path $lithoRoot "runs\$($Subset.Scope)\$($Subset.Fingerprint)\docs"
    $metadataPath = Join-Path $lithoRoot "runs\$($Subset.Scope)\$($Subset.Fingerprint)\run-metadata.json"
    if (-not $Force -and (Test-Path -LiteralPath $metadataPath -PathType Leaf)) {
        $cached = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
        if ($cached.success -eq $true -and (Test-Path -LiteralPath $outputDir -PathType Container)) {
            $cached.cache_reused = $true
            return $cached
        }
    }

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $metadataPath) | Out-Null
    New-Item -ItemType Directory -Force -Path $lithoCache | Out-Null
    $runtimeConfig = New-LithoRuntimeConfig $Subset.Scope $Subset.Fingerprint
    $beforeCache = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    Get-ChildItem -LiteralPath $lithoCache -Recurse -File -Filter "*.json" -ErrorAction SilentlyContinue |
        ForEach-Object { [void]$beforeCache.Add($_.FullName) }

    $googleApiKey = Get-GoogleApiKey
    $previousLithoKey = $env:LITHO_LLM_API_KEY
    $previousPath = $env:PATH
    $logPath = Join-Path (Split-Path -Parent $metadataPath) "litho-run.log"
    $timer = [Diagnostics.Stopwatch]::StartNew()
    $exitCode = -1
    try {
        $env:LITHO_LLM_API_KEY = $googleApiKey
        if ($mermaidFixer -and $mermaidFixer.Source) {
            $fixerDirectory = Split-Path -Parent $mermaidFixer.Source
            $env:PATH = (($previousPath -split [IO.Path]::PathSeparator | Where-Object {
                $_ -and -not ([IO.Path]::GetFullPath($_).TrimEnd('\') -ieq [IO.Path]::GetFullPath($fixerDirectory).TrimEnd('\'))
            }) -join [IO.Path]::PathSeparator)
        }
        $arguments = @(
            "--project-path", $Subset.Root,
            "--output-path", $outputDir,
            "--config", $runtimeConfig,
            "--name", "Saad Studio targeted architecture",
            "--llm-provider", $Policy.provider,
            "--model-efficient", $Policy.model_efficient,
            "--model-powerful", $Policy.model_powerful,
            "--max-tokens", "4096",
            "--temperature", "0.1",
            "--max-parallels", "1",
            "--tool-concurrency", "1",
            "--target-language", "en",
            "--boundary-code-limit", "10",
            "--boundary-include-source", "false"
        )
        & $lithoBinary @arguments 2>&1 | Tee-Object -LiteralPath $logPath | Out-Host
        $exitCode = $LASTEXITCODE
    } finally {
        $timer.Stop()
        if ($null -eq $previousLithoKey) {
            Remove-Item Env:LITHO_LLM_API_KEY -ErrorAction SilentlyContinue
        } else {
            $env:LITHO_LLM_API_KEY = $previousLithoKey
        }
        $env:PATH = $previousPath
        $googleApiKey = $null
    }
    if ($exitCode -ne 0) {
        throw "Litho failed with exit code $exitCode. See the local ignored log at '$logPath'."
    }

    $usage = Get-NewCacheUsage $beforeCache
    $documents = @(Get-ChildItem -LiteralPath $outputDir -Recurse -File -Filter "*.md")
    $allText = ($documents | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }) -join "`n"
    $toolCalls = @(Select-String -LiteralPath $logPath -Pattern 'tool called\.\.\.(file_reader|file_explorer)' -AllMatches).Matches.Count
    $c4 = $allText -match '(?i)C4|System Context|Container Diagram|Component Diagram'
    $mermaid = $allText -match '(?i)```mermaid'
    $erd = $allText -match '(?i)erDiagram|Entity.Relationship|Database Architecture'
    $estimatedCost = ($usage.input_tokens / 1000000.0 * 0.30) + ($usage.output_tokens / 1000000.0 * 2.50)

    $metadata = [pscustomobject]@{
        success = $true
        cache_reused = $false
        provider = $Policy.provider
        model_efficient = $Policy.model_efficient
        model_powerful = $Policy.model_powerful
        fallback_to_another_model = $false
        scope = $Subset.Scope
        fingerprint = $Subset.Fingerprint
        selected_files = $Subset.Files
        generated_documents = $documents.Count
        input_tokens_estimated_by_litho = $usage.input_tokens
        output_tokens_estimated_by_litho = $usage.output_tokens
        structured_cache_entries = $usage.structured_entries
        function_tool_calls_observed = $toolCalls
        estimated_cost_usd = [Math]::Round($estimatedCost, 6)
        duration_seconds = [Math]::Round($timer.Elapsed.TotalSeconds, 2)
        c4_generated = $c4
        mermaid_generated = $mermaid
        erd_generated = $erd
        output_path = $outputDir
        completed_at = [DateTimeOffset]::UtcNow.ToString("O")
    }
    $metadata | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $metadataPath -Encoding utf8NoBOM
    return $metadata
}

switch ($Action) {
    "status" {
        $policy = Get-ProviderPolicy
        [pscustomobject]@{
            Repository = $repoRoot
            TerrainSource = $terrainSource
            TerrainCoreOnly = $true
            TerrainBuilt = Test-Path -LiteralPath $terrainBinary
            LithoSource = $lithoSource
            LithoBuilt = Test-Path -LiteralPath $lithoBinary
            LithoExecution = "approved-gemini-development-only"
            Provider = $policy.provider
            EfficientModel = $policy.model_efficient
            PowerfulModel = $policy.model_powerful
            CrossModelFallback = $policy.fallback_to_another_model
            SecretSource = $policy.source_secret_env
            SecretStoredInConfig = $false
            LithoConfig = $lithoConfig
            LithoCache = $lithoCache
        } | Format-List
    }
    "build-terrain-core" { Build-TerrainCoreBridge }
    "terrain-scan" {
        if (-not (Test-Path -LiteralPath $terrainBinary)) { Build-TerrainCoreBridge }
        Invoke-TerrainJson "scan" | ConvertTo-Json -Depth 8
    }
    "terrain-refresh" {
        if (-not (Test-Path -LiteralPath $terrainBinary)) { Build-TerrainCoreBridge }
        $Force = $true
        Ensure-TerrainIndex | ConvertTo-Json -Depth 8
    }
    "terrain-overview" { Invoke-TerrainJson "overview" | ConvertTo-Json -Depth 8 }
    "terrain-freshness" { Invoke-TerrainJson "freshness" | ConvertTo-Json -Depth 8 }
    "terrain-grep" {
        if ([string]::IsNullOrWhiteSpace($Query)) { throw "terrain-grep requires -Query." }
        Invoke-TerrainJson "grep-pack" @($Query, "3", "30") | ConvertTo-Json -Depth 8
    }
    "litho-smoke" {
        $policy = Get-ProviderPolicy
        $subset = New-SyntheticSmokeSubset $policy
        Invoke-LithoSubset $subset $policy | ConvertTo-Json -Depth 8
    }
    "terrain-litho-smoke" {
        if (-not (Test-Path -LiteralPath $terrainBinary)) { Build-TerrainCoreBridge }
        $policy = Get-ProviderPolicy
        $stage = New-SyntheticSmokeSubset $policy
        $targetProject = "saad-studio-safe-smoke-$($stage.Fingerprint)"
        $targetPack = Join-Path $stage.Root ".terrain\agent\repomix.md"
        if ($Force -or -not (Test-Path -LiteralPath $targetPack -PathType Leaf)) {
            $null = Invoke-TerrainTargetJson "scan" $stage.Root $targetProject
        }
        $freshness = Invoke-TerrainTargetJson "freshness" $stage.Root $targetProject
        $hits = @(Invoke-TerrainTargetJson "grep-pack" $stage.Root $targetProject @("CreditEntry|CreditService|grantCredits", "2", "20"))
        $terrainContext = [pscustomobject]@{
            terrain_project = $targetProject
            source_index_score = $freshness.agent_pack_score
            current_git_head = Get-OptionalProperty $freshness "current_git_head"
            hit_count = $hits.Count
            hit_files = @($hits | ForEach-Object { $_.file_path } | Where-Object { $_ } | Sort-Object -Unique)
        } | ConvertTo-Json -Depth 5
        Set-Content -LiteralPath (Join-Path $stage.Root "TERRAIN_CONTEXT.md") -Value $terrainContext -Encoding utf8NoBOM
        $stage.Scope = "terrain-litho-safe-smoke"
        Invoke-LithoSubset $stage $policy | ConvertTo-Json -Depth 8
    }
    "terrain-litho" {
        if (-not (Test-Path -LiteralPath $terrainBinary)) { Build-TerrainCoreBridge }
        $policy = Get-ProviderPolicy
        $files = @(
            "package.json",
            "prisma\schema.prisma",
            "app\api\admin\users\[userId]\route.ts",
            "lib\credit-ledger.ts",
            "lib\credit-reconciler.ts"
        )
        $preContext = "Bounded local Terrain indexing input. Full repository indexing is intentionally disabled."
        $preSubset = New-TargetedSubset "terrain-stage" $files $preContext $policy
        $targetProject = "$Project-targeted-$($preSubset.Fingerprint)"
        $targetPack = Join-Path $preSubset.Root ".terrain\agent\repomix.md"
        if ($Force -or -not (Test-Path -LiteralPath $targetPack -PathType Leaf)) {
            $null = Invoke-TerrainTargetJson "scan" $preSubset.Root $targetProject
        }
        $freshness = Invoke-TerrainTargetJson "freshness" $preSubset.Root $targetProject
        $hits = @(Invoke-TerrainTargetJson "grep-pack" $preSubset.Root $targetProject @($Query, "2", "30"))
        $terrainContext = [pscustomobject]@{
            query = $Query
            terrain_project = $targetProject
            source_index_score = $freshness.agent_pack_score
            current_git_head = Get-OptionalProperty $freshness "current_git_head"
            working_tree_dirty = $freshness.working_tree_dirty
            selected_files = $files
            hit_count = $hits.Count
            hit_files = @($hits | ForEach-Object { $_.file_path } | Where-Object { $_ } | Sort-Object -Unique)
        } | ConvertTo-Json -Depth 5
        $subset = New-TargetedSubset "terrain-litho" $files $terrainContext $policy
        Invoke-LithoSubset $subset $policy | ConvertTo-Json -Depth 8
    }
}
