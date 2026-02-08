# runner-template

Repo nay dung de luu template CI/CD co the copy qua cac repo khac, gom:

- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Azure Pipelines workflow: `.azure/deploy.yml`
- Mau ignore cho runtime/secrets: `.gitignore`, `.npmignore`
- Mau bien moi truong: `.env.example`
- Lich su version template: `CHANGELOG.md`
- CLI copy template: `runner-template-copy.js`, `package.json`

## Muc tieu

- Tao 1 bo deploy co san, co comment option de doi nhanh theo tung repo.
- Tranh lap lai viec viet pipeline moi cho moi project.
- Chuan hoa trigger, path filter, runner, env secret, va cleanup.

## Cach dung nhanh

1. Copy file template can dung sang repo dich:
   - GitHub: copy `.github/workflows/deploy.yml`
   - Azure: copy `.azure/deploy.yml`
2. Cap nhat trigger:
   - `branches`
   - `tags`
   - `paths` (chi chay khi thay doi file/folder nay)
   - `paths-ignore`/`exclude` (bo qua docs, markdown, file khong can deploy)
3. Chon runner:
   - GitHub `runs-on`: `ubuntu-latest` / `windows-latest` / `macos-latest` / `self-hosted`
   - Azure `vmImage`: `ubuntu-latest` / `windows-latest` / `macos-latest`
4. Khai bao secret/variable bat buoc:
   - `DOTENVRTDB_URL`
5. Chinh cac buoc script theo repo:
   - package can cai
   - file can pull tu `dotenvrtdb`
   - docker compose file duoc dung

## CLI copy bang npm link

Package nay co CLI toi gian `runner-template-copy` de copy nhanh file template.

1. Tai repo `runner-template`, tao global link:
   - `npm link`
2. Sang repo dich (thu muc can copy file), chay:
   - `runner-template-copy`
3. Neu muon ghi de file da ton tai:
   - `runner-template-copy --force`

Mac dinh CLI se skip file da ton tai de an toan.

File duoc copy:

- `.github/workflows/deploy.yml`
- `.azure/deploy.yml`
- `.env.example`
- `.gitignore`
- `.npmignore`

## Giai thich nhanh path filter

- GitHub Actions:
  - `on.push.paths`: workflow chi chay neu file thay doi nam trong danh sach.
  - `on.push.paths-ignore`: bo qua thay doi khong quan trong.
  - `on.pull_request.paths` va `on.pull_request.paths-ignore`: tuong tu cho PR.
- Azure Pipelines:
  - `trigger.paths.include`: chi build khi co thay doi trong path include.
  - `trigger.paths.exclude`: bo qua path khong can build.
  - `pr.paths.include`/`pr.paths.exclude`: tuong tu cho PR validation.

## Bien va secret

- GitHub Actions:
  - Dung `${{ secrets.DOTENVRTDB_URL }}`
  - Co the them `${{ vars.* }}` cho bien khong nhay cam.
- Azure Pipelines:
  - Dung `$(DOTENVRTDB_URL)` va khai bao trong pipeline variables/variable groups.
  - Danh dau secret cho bien nhay cam.

## Versioning

- Xem `CHANGELOG.md` de theo doi thay doi theo tung version template.
- Khuyen nghi tag theo format `vMAJOR.MINOR.PATCH` khi thay doi template.

## Luu y

- Template hien tai uu tien Linux shell (`ubuntu-latest`).
- Neu doi sang Windows runner, can doi syntax script (`: > .env`, quote, command format).
- Co step cleanup `docker compose down -v` de tranh ton tai nguyen sau khi job ket thuc.
