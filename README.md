# runner-template

Repo nay dung de luu template CI/CD co the copy qua cac repo khac, gom:

- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Azure Pipelines workflow: `.azure/deploy.yml`
- Mau ignore cho runtime/secrets: `.gitignore`, `.npmignore`
- Mau bien moi truong: `.env.example`
- Lich su version template: `CHANGELOG.md`

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
   - GitHub `runs-on`: `ubuntu-latest` / `windows-latest` / `macos-latest` / self-hosted
   - Azure `vmImage`: `ubuntu-latest` / `windows-latest` / `macos-latest`
4. Khai bao secret/variable bat buoc:
   - `DOTENVRTDB_URL`
5. Chinh cac buoc script theo repo:
   - package can cai
   - file can pull tu `dotenvrtdb`
   - docker compose file duoc dung

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

## De xuat nen them (cho ban xac nhan)

- [x] Them `.env.example` list day du key can co (`DOTENVRTDB_URL`, `CLOUDFLARED_*`, `DOCKER_COMPOSE`...).
- [ ] Them `templates/` cho nhieu profile deploy:
  - `node-basic`
  - `docker-compose`
  - `self-hosted-runner`
- [ ] Them buoc smoke-check sau `docker compose up` (health endpoint hoac container status).
- [ ] Them buoc fail-fast neu thieu secret bat buoc truoc khi deploy.
- [ ] Them workflow lint YAML (`actionlint`) de check template truoc khi copy.
- [ ] Them huong dan rieng cho `windows-latest` (doi script shell sang pwsh).
- [x] Them changelog cho template de theo doi su thay doi giua cac version.

## Luu y

- Template hien tai uu tien Linux shell (`ubuntu-latest`).
- Neu doi sang Windows runner, can doi syntax script (`: > .env`, quote, command format).
- Co step cleanup `docker compose down -v` de tranh ton tai nguyen sau khi job ket thuc.
