<template>
  <footer class="bottom bg-black p-3">
    <div class="container">
      <section class="mt-2">
        <div class="row text-center d-flex justify-content-center pt-2">
          <div class="col-md-2">
            <h6 class="text-uppercase font-weight-bold">
              <router-link to="/main" class="text-white">이용약관</router-link>
            </h6>
          </div>

          <div class="col-md-2">
            <h6 class="text-uppercase font-weight-bold">
              <router-link to="/main" class="text-white">팀소개</router-link>
            </h6>
          </div>
        </div>
      </section>

      <hr class="my-2" />

      <section class="mb-2">
        <div class="row d-flex justify-content-center">
          <div class="col-sm-8">
            <p>
              (주)예담직업전문학교 대구광역시 중구 중앙대로 403 (남일동 135-1,
              5층) / 팀장: 김재현 Tel:010-8263-3005
            </p>
            <p>대표 amikjh@naver.com / 개인정보보호책임자:김재현</p>
          </div>
        </div>
      </section>
    </div>

    <div class="text-center p-3" style="background-color: rgba(0, 0, 0, 0.2)">
      © Copyright 2023 <a>(주)팀명 All Rights Reserved</a>
    </div>
  </footer>
</template>

<style scoped>
footer > * {
  color: #ccc;
}
</style>
