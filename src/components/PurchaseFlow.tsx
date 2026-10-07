const STEPS = [
  {
    title: 'お問い合わせ',
    text: '気になるコインの詳細ページから、お名前・メールアドレス・ご質問をお送りください。',
  },
  {
    title: '担当者よりご案内',
    text: '在庫・状態の確認とお取引条件を、メールにて個別にご連絡いたします。',
  },
  {
    title: 'ご購入・お届け',
    text: 'ご成約後、お支払いを確認のうえ、厳重に梱包してお届けいたします。',
  },
];

export default function PurchaseFlow() {
  return (
    <section id="flow" className="flow">
      <div className="container">
        <div className="flow-head">
          <div className="eyebrow">HOW TO PURCHASE</div>
          <h2 className="mincho">ご購入の流れ</h2>
          <p>オンライン決済・カート機能はございません。一点ずつ、担当者がご案内いたします。</p>
        </div>
        <ol className="flow-steps" style={{ listStyle: 'none', padding: 0 }}>
          {STEPS.map((s, i) => (
            <li key={s.title} className="flow-step">
              <span className="flow-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="flow-title">{s.title}</span>
              <span className="flow-text">{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
