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

GitHub Actions가 매주 목요일에 세계은행 Pink Sheet와 FRED를 확인하여 최근 10년치 `data.json`을 갱신합니다. 저장소의 `Actions` 탭에서 `Update coffee price data`를 선택한 뒤 `Run workflow`를 누르면 즉시 갱신할 수도 있습니다.

자동 커밋이 권한 오류로 실패하면:

1. `Settings` > `Actions` > `General`
2. `Workflow permissions`
3. `Read and write permissions` 선택
4. `Save`

## 로컬 확인

`index.html`을 직접 열어도 최근 월별 자료가 표시됩니다. 자동 갱신 전의 `최근 10년` 화면은 완결된 연도의 공식 연평균 자료와 현재 연도의 최신 월 가격을 함께 표시합니다. 최신 연도 지점은 `2026년 최신(5월)`처럼 구분됩니다. GitHub Actions가 한 번 실행된 뒤에는 최근 10년 월별 자료가 우선 표시됩니다.

## 저작권 한마디^^
© 2026 로스터현. 무단 복제 및 재배포를 금합니다. 저작권자 꼭 표시해주세요~ 디지털 에티켓^^!

## v2.0 업데이트 안내 (2026-10)

기존 FRED 커피 가격 데이터가 2026년 7월에서 멈추어 보이던 상황을 개선했습니다.

- `update_data.py`가 세계은행 **Pink Sheet 월간 원본 엑셀**과 기존 FRED 지표를 확인하고, **실제로 더 최신 관측월이 존재하는 단일 출처**를 선택합니다. 두 지표를 중간에서 섞지 않습니다.
- 세계은행 엑셀의 원본 **USD/kg**를 기존 화면과 동일한 **US cents/lb**로 환산합니다. (`USD/kg × 100 ÷ 2.2046226218`)
- 선택한 출처는 `data.json`의 `source`, `sourceUrl`, `series`에 기록합니다. 출처가 바뀌면 과거 값도 해당 출처의 값으로 바뀔 수 있습니다.
- FRED 환율은 계속 독립적으로 갱신되며, 환율 소스 오류 시 저장된 환율을 보존합니다.
- 최신 관측월 및 실제 데이터가 달라지지 않으면 `data.json`을 재커밋하지 않습니다.
- 데이터 확인 버튼은 원본 `data.json`을 강제 재요청하고, 새 관측월 여부와 출처를 안내합니다. **브라우저 버튼은 GitHub Actions를 원격 실행하지 않습니다.** 가격 데이터는 GitHub Actions의 예약 실행 또는 수동 `Run workflow`로 생성됩니다.

### 최초 적용

1. ZIP을 풀고 `.github` 폴더까지 포함해 저장소 `main`에 업로드합니다.
2. GitHub `Actions` → `Update coffee price data` → `Run workflow`를 한 번 실행합니다.
3. 실행 성공 후 `data.json`의 `latestObservation`, `source`가 변경되었는지 확인합니다.
4. GitHub Pages 배포가 반영되면 홈페이지의 `최신 데이터 확인`을 클릭합니다.

GitHub Actions는 매주 목요일 15:00 KST에 실행됩니다. 원본 자료의 발표 시점에 따라 최신 관측월은 현재 월보다 늦을 수 있습니다.

**주의:** 이 ZIP의 `data.json`은 사용자가 제공한 기존 파일입니다. 이 환경에서는 세계은행/FRED 실제 다운로드 실행을 검증할 수 없어 미래 수치를 임의로 생성하지 않았습니다. `Run workflow` 실행 후 최신 수치가 반영됩니다. 원본 서비스 구조 변경으로 파일을 읽지 못한 경우 Actions 로그에 오류가 표시되고 기존 파일은 보존됩니다.
