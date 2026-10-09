import UploadButton from './UploadButton';
import styles from './uploadDesignCard.module.css';

const art = '/upload-design/';

export default function UploadDesignCard() {
  return (
    <div className={styles.card}>
      <div className={styles.artwork} aria-hidden="true">
        <div className={styles.rightHand}>
          <div><img src={`${art}right-hand.png`} alt="" /></div>
        </div>
        <img className={styles.wash} src={`${art}wash.svg`} alt="" />
        <div className={styles.leftHand}><img src={`${art}left-hand.png`} alt="" /></div>
        <div className={`${styles.coin} ${styles.topCoin}`}><img src={`${art}coin.png`} alt="" /></div>
        <div className={`${styles.coin} ${styles.bottomCoin}`}><img src={`${art}coin.png`} alt="" /></div>
        <div className={`${styles.coin} ${styles.rightCoin}`}><img src={`${art}coin.png`} alt="" /></div>
      </div>
      <div className={styles.content}>
        <div className={styles.copy}>
          <h2 className={styles.title}><span>Upload New</span><span>Jewellery</span></h2>
          <p className={styles.subtitle}>Reimagine Your Collection</p>
        </div>
        <UploadButton className={styles.button} iconSrc={`${art}upload.svg`} />
      </div>
    </div>
  );
}
