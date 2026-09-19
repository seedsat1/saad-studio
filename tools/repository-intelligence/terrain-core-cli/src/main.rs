use std::{env, fs, path::PathBuf};

use anyhow::{bail, Context, Result};
use terrain_core::{
    compute_freshness, get_project_overview, grep_repomix_pack, KnowledgePaths, ProjectScanner,
};

fn required(args: &[String], index: usize, label: &str) -> Result<String> {
    args.get(index)
        .cloned()
        .with_context(|| format!("missing required argument: {label}"))
}

fn print_json<T: serde::Serialize>(value: &T) -> Result<()> {
    println!("{}", serde_json::to_string_pretty(value)?);
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    let args: Vec<String> = env::args().collect();
    let action = required(&args, 1, "action")?;
    let repo = PathBuf::from(required(&args, 2, "repository path")?);
    let slug = required(&args, 3, "project slug")?;
    let repo_text = repo.display().to_string();
    let paths = KnowledgePaths::for_repo(&repo);

    match action.as_str() {
        "scan" => {
            let report = ProjectScanner::new(paths)
                .scan_repo(&repo_text, Some(&slug))
                .await?;
            print_json(&report)
        }
        "freshness" => print_json(&compute_freshness(&paths, &slug, &repo_text)?),
        "overview" => print_json(&get_project_overview(&paths, &slug)?),
        "grep-pack" => {
            let pattern = required(&args, 4, "search pattern")?;
            let context = args.get(5).and_then(|v| v.parse().ok()).unwrap_or(3);
            let limit = args.get(6).and_then(|v| v.parse().ok()).unwrap_or(30);
            let pack_path = paths.agent_pack_main(&slug);
            let pack = fs::read_to_string(&pack_path)
                .with_context(|| format!("read Terrain pack {}", pack_path.display()))?;
            print_json(&grep_repomix_pack(&pack, &pattern, context, limit)?)
        }
        other => bail!("unsupported action: {other}"),
    }
}
