import styles from '@/app/academy/academy.module.css';

export function CountrysideBackground() {
  return (
    <svg
      className={styles.landscape}
      viewBox="0 0 390 1320"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe7ef" />
          <stop offset="0.34" stopColor="#dcefd9" />
          <stop offset="0.7" stopColor="#edf1c4" />
          <stop offset="1" stopColor="#f3d77c" />
        </linearGradient>
        <linearGradient id="farMountain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fc2ba" />
          <stop offset="1" stopColor="#7ba692" />
        </linearGradient>
        <linearGradient id="nearMountain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e9d7b" />
          <stop offset="1" stopColor="#9bc47f" />
        </linearGradient>
        <linearGradient id="forest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d8b67" />
          <stop offset="1" stopColor="#8fc174" />
        </linearGradient>
        <linearGradient id="hills" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a7ce81" />
          <stop offset="1" stopColor="#d0df8b" />
        </linearGradient>
        <linearGradient id="meadow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bfdc7d" />
          <stop offset="1" stopColor="#e7cd71" />
        </linearGradient>
        <linearGradient id="river" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bce9e8" />
          <stop offset="1" stopColor="#75c9d0" />
        </linearGradient>
        <pattern id="fieldRows" width="34" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-9)">
          <path d="M 2 0 V 26" stroke="#b79a47" strokeWidth="2" opacity="0.23" />
          <path d="M 14 0 V 26" stroke="#f4e6a0" strokeWidth="4" opacity="0.24" />
        </pattern>
      </defs>

      <rect width="390" height="1320" fill="url(#sky)" />

      <path
        d="M0 220 L0 130 L50 178 L95 78 L145 183 L205 102 L252 178 L313 55 L390 168 L390 280 Z"
        fill="url(#farMountain)"
        opacity="0.8"
      />
      <path
        d="M0 290 L0 220 L58 155 L114 244 L173 123 L226 246 L294 142 L390 237 L390 330 Z"
        fill="url(#nearMountain)"
      />
      <path d="M173 123 L190 160 L207 141 L226 246 L173 123" fill="#eaf4e0" opacity="0.56" />
      <path d="M294 142 L312 183 L326 164 L347 196 L294 142" fill="#eaf4e0" opacity="0.42" />

      <path
        d="M0 295 C33 240 64 298 95 265 C127 228 166 291 204 260 C247 226 284 283 323 250 C346 232 374 243 390 254 L390 510 L0 510 Z"
        fill="url(#forest)"
      />
      <g fill="#497959" opacity="0.95">
        <path d="M22 322 l16 -50 l16 50 h-10 l13 34 h-38 l13 -34 Z" />
        <path d="M72 308 l18 -58 l18 58 h-12 l14 39 h-41 l14 -39 Z" />
        <path d="M142 319 l14 -46 l14 46 h-9 l12 31 h-34 l12 -31 Z" />
        <path d="M232 305 l19 -62 l19 62 h-12 l15 40 h-44 l15 -40 Z" />
        <path d="M305 319 l15 -51 l15 51 h-10 l13 33 h-36 l13 -33 Z" />
        <path d="M355 303 l20 -65 l20 65 h-13 l15 42 h-44 l15 -42 Z" />
      </g>
      <g fill="#b9dc84" opacity="0.9">
        <circle cx="38" cy="391" r="24" />
        <circle cx="78" cy="379" r="30" />
        <circle cx="119" cy="398" r="23" />
        <circle cx="279" cy="390" r="31" />
        <circle cx="325" cy="374" r="26" />
        <circle cx="370" cy="402" r="29" />
      </g>

      <path
        d="M0 470 C55 420 100 456 141 486 C177 512 217 492 256 460 C297 427 341 430 390 465 L390 805 L0 805 Z"
        fill="url(#hills)"
      />
      <path
        d="M0 580 C58 524 108 572 160 602 C213 631 257 592 305 556 C341 529 370 545 390 560 L390 848 L0 848 Z"
        fill="#c7dc83"
      />
      <path
        d="M390 417 C346 466 356 522 316 568 C282 609 300 665 256 709 C224 743 241 801 202 852 C178 884 194 923 153 971"
        fill="none"
        stroke="url(#river)"
        strokeWidth="28"
        strokeLinecap="round"
        opacity="0.96"
      />
      <path
        d="M390 417 C346 466 356 522 316 568 C282 609 300 665 256 709 C224 743 241 801 202 852 C178 884 194 923 153 971"
        fill="none"
        stroke="#e8fbf4"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="2 15"
        opacity="0.8"
      />
      <path d="M99 575 Q145 559 190 583" fill="none" stroke="#9f6f3f" strokeWidth="7" strokeLinecap="round" />
      <path d="M105 566 L102 594 M122 562 L119 590 M145 562 L142 590 M166 568 L163 595 M184 575 L181 600" stroke="#b98650" strokeWidth="4" strokeLinecap="round" />

      <path
        d="M0 792 C57 747 117 788 164 821 C217 859 276 816 330 785 C352 772 373 776 390 790 L390 1320 L0 1320 Z"
        fill="url(#meadow)"
      />
      <path d="M0 880 C78 835 146 890 221 922 C291 952 344 906 390 875 L390 1320 L0 1320 Z" fill="#e9d47c" />
      <path d="M0 959 C60 921 126 948 181 981 C244 1018 310 992 390 938 L390 1320 L0 1320 Z" fill="#d7b85e" opacity="0.92" />
      <path d="M0 842 C83 816 150 845 215 884 C285 927 333 883 390 858" fill="none" stroke="#f7ecad" strokeWidth="11" opacity="0.72" />
      <path d="M0 840 C83 814 150 843 215 882 C285 925 333 881 390 856" fill="none" stroke="#8aad5c" strokeWidth="3" opacity="0.65" />
      <rect x="0" y="940" width="390" height="380" fill="url(#fieldRows)" />

      <g fill="#7cae5c" opacity="0.9">
        <circle cx="30" cy="770" r="16" />
        <circle cx="48" cy="759" r="21" />
        <circle cx="67" cy="772" r="16" />
        <circle cx="343" cy="721" r="18" />
        <circle cx="365" cy="710" r="24" />
        <circle cx="386" cy="724" r="17" />
      </g>
      <g stroke="#7c9e52" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <path d="M46 1088 v-28 M46 1070 l-9 -10 M46 1075 l10 -12" />
        <path d="M70 1115 v-32 M70 1096 l-10 -11 M70 1102 l11 -13" />
        <path d="M316 1038 v-33 M316 1020 l-10 -11 M316 1027 l12 -13" />
        <path d="M339 1066 v-29 M339 1049 l-9 -10 M339 1054 l11 -12" />
      </g>
      <g fill="#fff4b8" opacity="0.94">
        <circle cx="32" cy="650" r="3" />
        <circle cx="65" cy="693" r="2.5" />
        <circle cx="105" cy="625" r="3" />
        <circle cx="145" cy="730" r="2.5" />
        <circle cx="282" cy="756" r="3" />
        <circle cx="326" cy="658" r="2.5" />
      </g>
    </svg>
  );
}
