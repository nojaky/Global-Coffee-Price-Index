# 국제 커피 가격 지표

아라비카와 로부스타의 국제 월평균 가격을 PC와 모바일에서 비교하는 GitHub Pages용 웹앱입니다.

## 데이터

- 아라비카: FRED `PCOFFOTMUSDM`
- 로부스타: FRED `PCOFFROBUSDM`
- 원자료: International Monetary Fund, Primary Commodity Prices
- 단위: U.S. cents per pound
- 주기: 월평균
- 원화 환산 환율: FRED `DEXKOUS` 최신 원/달러 현물환율

이 값은 국제시장 대표 월평균 지표이며 ICE 선물 특정 거래일 종가와는 다를 수 있습니다.

`원/kg` 표시는 `US￠/lb ÷ 100 × 원/달러 환율 × 2.20462`로 계산합니다. 1lb는 453.592g입니다. 원화 환산값에는 운임, 관세, 부가세, 보험료, 수입사 비용 및 유통 마진이 포함되지 않습니다.

## GitHub 업로드

압축을 풀고 숨김 폴더인 `.github`를 포함해 모든 파일과 폴더를 저장소 최상위에 업로드합니다.

```text
index.html
styles.css
app.js
data.json
update_data.py
.github/workflows/update-data.yml
```

`Settings` > `Pages`에서 `Deploy from a branch`, `main`, `/(root)`를 선택합니다.

## 자동 업데이트

GitHub Actions가 매월 8일에 FRED CSV를 내려받아 최근 10년치 `data.json`을 갱신합니다. 저장소의 `Actions` 탭에서 `Update coffee price data`를 선택한 뒤 `Run workflow`를 누르면 즉시 갱신할 수도 있습니다.

자동 커밋이 권한 오류로 실패하면:

1. `Settings` > `Actions` > `General`
2. `Workflow permissions`
3. `Read and write permissions` 선택
4. `Save`

## 로컬 확인

`index.html`을 직접 열어도 최근 월별 자료가 표시됩니다. 자동 갱신 전의 `최근 10년` 화면은 완결된 연도의 공식 연평균 자료와 현재 연도의 최신 월 가격을 함께 표시합니다. 최신 연도 지점은 `2026년 최신(5월)`처럼 구분됩니다. GitHub Actions가 한 번 실행된 뒤에는 최근 10년 월별 자료가 우선 표시됩니다.

## 저작권 한마디^^
© 2026 로스터현. 무단 복제 및 재배포를 금합니다. 저작권자 꼭 표시해주세요~ 디지털 에티켓^^!
