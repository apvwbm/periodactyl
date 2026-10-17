<p align="center">
  <img src="assets/icon.png" width="112" alt="PERIODactyl icon" />
</p>

<h1 align="center">PERIODactyl</h1>

<p align="center">
  <strong>A private period diary.</strong><br />
  Log your days, see your next period coming, and keep every bit of it on your phone.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Android-A3245A?style=flat-square&logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/free-A3245A?style=flat-square" alt="Free" />
  <img src="https://img.shields.io/badge/no%20ads-A3245A?style=flat-square" alt="No ads" />
  <img src="https://img.shields.io/badge/offline-A3245A?style=flat-square" alt="Offline" />
</p>

<p align="center">
  <a href="https://ko-fi.com/apvwbm"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Buy me a coffee on Ko-fi" /></a>
</p>

---

## What it does

- **One tap** when your period starts, another when it ends.
- **Next period as a range of dates**, from the median of your last cycles. Late? It stops
  counting down and tells you what to do.
- **How you feel each day**: flow, pain, a short list of symptoms and a note.
- **History**: typical cycle, shortest and longest, how regular it is, and your most
  frequent symptoms.
- **A report for your doctor** by cycle day, plus notes worth mentioning to one.
- **A discreet reminder** a couple of days before, scheduled on the phone.
- Estimated ovulation and fertile days, **only if you ask for them**.

In English and Spanish, light and dark.

## Privacy

Everything is stored encrypted on your phone. The app has no internet permission and no
Google or Firebase code: it cannot send anything anywhere. No accounts, no ads, no
analytics. Screenshots are blocked, and you can lock it with your fingerprint or PIN.

Why it matters: in 2021 the US Federal Trade Commission
[settled with Flo](https://www.ftc.gov/news-events/news/press-releases/2021/06/ftc-finalizes-order-flo-health-fertility-tracking-app-shared-sensitive-health-data-facebook-google)
for sharing users' health data with Facebook and Google despite promising privacy. As the
[EFF](https://www.eff.org/deeplinks/2022/05/what-companies-can-do-now-protect-digital-rights-post-roe-world)
puts it: if you don't have it, you can't produce it. PERIODactyl never has it.

> **Not a medical device or a method of contraception.** Predictions, ovulation and the
> fertile window are estimates for information only, and should not be used to avoid or
> to plan a pregnancy. If something worries you, talk to a healthcare professional.

## Install

Download `periodactyl.apk` from
[the latest release](https://github.com/apvwbm/periodactyl/releases/latest) and open it on
your phone. To update, install the new one on top: your data is kept. Uninstalling deletes
everything, so make an encrypted backup from Settings now and then.

<details>
<summary>For developers</summary>
<br />

Expo SDK 57 · React Native · TypeScript · SQLite encrypted with SQLCipher · a small Kotlin
module for the reminder.

```bash
npm install && npm start   # Expo Go (no encryption, no reminder)
npm run verifica           # logic tests
npm run apk                # APK on the Desktop (Windows + Android SDK)
```

</details>

---

<p align="center">
  Made by <a href="https://apvwbm.com/projects/periodactyl">Aitor Pérez</a>. Free, forever:
  if it helps, <a href="https://ko-fi.com/apvwbm">buy me a coffee</a>.<br />
  <sub>© 2026 Aitor Pérez. All rights reserved.</sub>
</p>
