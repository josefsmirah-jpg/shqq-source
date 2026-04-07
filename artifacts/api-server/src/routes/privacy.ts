import { Router } from "express";

const router = Router();

router.get("/privacy", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>سياسة الخصوصية - شقق وأراضي المستقبل</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; line-height: 1.8; }
  h1 { color: #1A5C2E; border-bottom: 2px solid #C9A022; padding-bottom: 10px; }
  h2 { color: #1A5C2E; margin-top: 30px; }
</style>
</head>
<body>
<h1>سياسة الخصوصية</h1>
<p>آخر تحديث: أبريل 2026</p>

<p>مرحباً بك في تطبيق <strong>شقق وأراضي المستقبل</strong>. نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.</p>

<h2>المعلومات التي نجمعها</h2>
<p>نجمع المعلومات التالية عند استخدامك للتطبيق:</p>
<ul>
  <li>الاسم وبيانات الاتصال (رقم الهاتف، البريد الإلكتروني) عند التسجيل</li>
  <li>معلومات العقارات التي تنشرها</li>
  <li>الصور التي ترفعها للإعلانات العقارية</li>
  <li>بيانات الاستخدام وسجلات التطبيق</li>
</ul>

<h2>كيف نستخدم معلوماتك</h2>
<ul>
  <li>تقديم خدمات التطبيق وعرض الإعلانات العقارية</li>
  <li>التواصل معك بشأن حسابك أو إعلاناتك</li>
  <li>تحسين خدماتنا وتجربة المستخدم</li>
  <li>الامتثال للمتطلبات القانونية</li>
</ul>

<h2>مشاركة المعلومات</h2>
<p>لا نبيع أو نشارك معلوماتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:</p>
<ul>
  <li>بموافقتك الصريحة</li>
  <li>لتقديم الخدمات المطلوبة (مثل استضافة الصور)</li>
  <li>عند الضرورة القانونية</li>
</ul>

<h2>حماية البيانات</h2>
<p>نستخدم تقنيات تشفير SSL/TLS لحماية بياناتك أثناء النقل، ونخزن البيانات على خوادم آمنة.</p>

<h2>حقوقك</h2>
<p>يحق لك:</p>
<ul>
  <li>الوصول إلى بياناتك الشخصية</li>
  <li>تصحيح أو حذف بياناتك</li>
  <li>سحب موافقتك في أي وقت</li>
</ul>

<h2>التواصل معنا</h2>
<p>لأي استفسارات حول سياسة الخصوصية، تواصل معنا عبر:</p>
<p>البريد الإلكتروني: josefsmirah@gmail.com</p>
</body>
</html>`);
});

router.get("/terms", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>شروط الاستخدام - شقق وأراضي المستقبل</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; line-height: 1.8; }
  h1 { color: #1A5C2E; border-bottom: 2px solid #C9A022; padding-bottom: 10px; }
  h2 { color: #1A5C2E; margin-top: 30px; }
</style>
</head>
<body>
<h1>شروط الاستخدام</h1>
<p>آخر تحديث: أبريل 2026</p>

<p>باستخدامك لتطبيق <strong>شقق وأراضي المستقبل</strong>، فإنك توافق على الشروط والأحكام التالية:</p>

<h2>1. قبول الشروط</h2>
<p>باستخدام هذا التطبيق، توافق على الالتزام بهذه الشروط. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام التطبيق.</p>

<h2>2. استخدام التطبيق</h2>
<ul>
  <li>يُستخدم التطبيق لأغراض عقارية مشروعة فقط</li>
  <li>يجب أن تكون المعلومات المقدمة صحيحة ودقيقة</li>
  <li>يُحظر نشر إعلانات مضللة أو احتيالية</li>
  <li>يُحظر استخدام التطبيق لأي غرض غير قانوني</li>
</ul>

<h2>3. المحتوى المنشور</h2>
<p>أنت مسؤول مسؤولية كاملة عن المحتوى الذي تنشره. نحتفظ بالحق في حذف أي محتوى يخالف هذه الشروط.</p>

<h2>4. الخصوصية</h2>
<p>استخدامك للتطبيق يخضع أيضاً لسياسة الخصوصية الخاصة بنا، والتي تعتبر جزءاً لا يتجزأ من هذه الشروط.</p>

<h2>5. حذف الحساب</h2>
<p>يحق لك حذف حسابك في أي وقت من خلال إعدادات التطبيق أو بالتواصل معنا.</p>

<h2>6. التواصل معنا</h2>
<p>لأي استفسارات: josefsmirah@gmail.com</p>
</body>
</html>`);
});

router.get("/delete-account", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>حذف الحساب - شقق وأراضي المستقبل</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; line-height: 1.8; }
  h1 { color: #1A5C2E; border-bottom: 2px solid #C9A022; padding-bottom: 10px; }
  h2 { color: #1A5C2E; margin-top: 30px; }
  .info-box { background: #f9f9f9; border-right: 4px solid #C9A022; padding: 15px; margin: 20px 0; border-radius: 4px; }
  a { color: #1A5C2E; }
</style>
</head>
<body>
<h1>طلب حذف الحساب</h1>
<p>آخر تحديث: أبريل 2026</p>

<p>في تطبيق <strong>شقق وأراضي المستقبل</strong>، نحترم حقك في حذف حسابك وجميع بياناتك المرتبطة به.</p>

<h2>كيفية طلب حذف الحساب</h2>
<p>لطلب حذف حسابك، يرجى التواصل معنا عبر البريد الإلكتروني:</p>

<div class="info-box">
  <strong>البريد الإلكتروني:</strong> <a href="mailto:josefsmirah@gmail.com">josefsmirah@gmail.com</a><br>
  <strong>الموضوع:</strong> طلب حذف الحساب<br>
  <strong>المحتوى:</strong> اذكر اسمك ورقم هاتفك المسجّل في التطبيق
</div>

<h2>البيانات التي سيتم حذفها</h2>
<ul>
  <li>معلومات الحساب (الاسم، رقم الهاتف، البريد الإلكتروني)</li>
  <li>جميع إعلاناتك العقارية</li>
  <li>الصور المرفوعة</li>
  <li>سجل النشاط والمراسلات</li>
</ul>

<h2>مدة التنفيذ</h2>
<p>سيتم تنفيذ طلب الحذف خلال <strong>7 أيام عمل</strong> من استلام الطلب.</p>

<h2>ملاحظة</h2>
<p>بعد حذف الحساب، لن تتمكن من استعادة أي بيانات أو إعلانات كانت مرتبطة بحسابك.</p>
</body>
</html>`);
});

router.get("/testers.csv", (req, res) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=testers.csv");
  res.send("josefsmirah@gmail.com\n");
});

export default router;
