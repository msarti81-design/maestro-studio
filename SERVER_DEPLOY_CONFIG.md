# Configurazione Deploy Server `freeserv.it` (IMPORTANTE - NON MODIFICARE)

- **Cartella UNICA del progetto sul server**: `/var/www/maestro-studio`
- **REGOLA TASSATIVA**: **NON scrivere MAI file di progetto in `/root`**! Non usare mai `/root` come cartella di lavoro o destinazione degli script di deploy.
- **Processo PM2**: `pm2 restart maestro-studio`
- **Repository GitHub**: `msarti81-design/maestro-studio` (branch `main`)
- **Workflow GitHub Actions Android**: `383384353` (`build-apk.yml`)
- **Credenziali Git**: Salvare e leggere il token da `/var/www/maestro-studio/.git/config` e `/root/.git-credentials` (impostando `https://msarti81-design:<TOKEN>@github.com/msarti81-design/maestro-studio.git` sul remote `origin` di `/var/www/maestro-studio`).
