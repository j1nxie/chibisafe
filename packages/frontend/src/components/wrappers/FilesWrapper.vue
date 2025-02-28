<template>
	<div class="my-4 bg-dark-90 h-14 mobile:h-auto px-2 mobile:py-2 flex items-center mobile:flex-wrap">
		<button
			type="button"
			class="bg-dark-80 text-light-100 p-2 h-10 mr-2"
			:title="preferMasonry ? 'Switch to list' : 'Switch to masonry'"
			@click="toggleMasonry"
		>
			<LayoutListIcon v-if="preferMasonry" />
			<LayoutDashboardIcon v-else />
		</button>
		<!-- <button type="button" class="bg-dark-80 text-light-100 p-2 h-10" @click="nothing">Bulk actions</button> -->
		<!-- Pagination -->
		<div class="flex-grow" />
		<span class="text-light-100">{{ filesCount }} files</span>
		<div class="desktop:flex-grow mobile:basis-full mobile:h-2" />
		<Pagination
			:currentPage="page"
			:count="filesCount ?? 0"
			:limit="limit"
			:previousPageFn="prevPage"
			:nextPageFn="nextPage"
			:goToPageFn="goToPage"
			class="mobile:basis-full"
		/>
	</div>

	<Masonry v-if="preferMasonry" :type="type" :files="files" />
	<FilesTable v-else :type="type" :files="files" />

	<div class="my-4 bg-dark-90 h-14 mobile:h-auto px-2 mobile:py-2 flex items-center mobile:flex-wrap mobile:mb-20">
		<button
			type="button"
			class="bg-dark-80 text-light-100 p-2 h-10 mr-2"
			:title="preferMasonry ? 'Switch to list' : 'Switch to masonry'"
			@click="toggleMasonry"
		>
			<LayoutListIcon v-if="preferMasonry" />
			<LayoutDashboardIcon v-else />
		</button>
		<!-- <button type="button" class="bg-dark-80 text-light-100 p-2 h-10" @click="nothing">Bulk actions</button> -->
		<!-- Pagination -->
		<div class="flex-grow" />
		<span class="text-light-100">{{ filesCount }} files</span>
		<div class="desktop:flex-grow mobile:basis-full mobile:h-2" />
		<Pagination
			:currentPage="page"
			:count="data?.count ?? 0"
			:limit="limit"
			:previousPageFn="prevPage"
			:nextPageFn="nextPage"
			:goToPageFn="goToPage"
			class="mobile:basis-full"
		/>
	</div>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { LayoutDashboardIcon, LayoutListIcon } from 'lucide-vue-next';
import { computed, ref, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import {
	getAlbum,
	getFiles,
	getFilesAdmin,
	getFilesFromIP,
	getFilesFromPublicAlbum,
	getFilesFromUser
} from '@/use/api';
import Masonry from '~/components/masonry/Masonry.vue';
import Pagination from '~/components/pagination/Pagination.vue';
import FilesTable from '~/components/table/FilesTable.vue';
import { publicOnly } from '~/store/files';
import { useUserStore } from '~/store/user';

const props = defineProps<{
	type: 'admin' | 'quarantine' | 'album' | 'publicAlbum' | 'uploads';
	uuid?: string;
	identifier?: string;
	userId?: string;
	ip?: string;
}>();

const userStore = useUserStore();
const route = useRoute();

const page = ref(route.query.page ? Number(route.query.page ?? 1) : 1);
const limit = ref(50);
const anon = computed(() => publicOnly.value);

const fetchKey = computed(() => {
	const key = [];
	if (props.type === 'admin') {
		key.push('admin');

		if (props.userId) {
			key.push('user', props.userId);
		} else if (props.ip) {
			key.push('ip', props.ip);
		}
	}

	if (props.type === 'album') {
		key.push('album');
	} else if (props.type === 'publicAlbum') {
		key.push('publicAlbum', props.identifier);
	} else {
		key.push('files');
	}

	key.push({ page: page.value, limit: limit.value, anon: anon.value });
	return key;
});

const files = computed(() => {
	if (props.type === 'album') {
		return data.value?.album?.files ?? [];
	}

	return data.value?.files ?? [];
});

const filesCount = computed(() => {
	if (props.type === 'album') {
		return data.value?.album?.filesCount ?? 0;
	}

	return data.value?.count ?? 0;
});

// @ts-ignore
// eslint-disable-next-line consistent-return
const typeToFetch = (currentPage: Ref<number>, currentLimit: Ref<number>, anonymous: Ref<boolean>) => {
	switch (props.type) {
		case 'admin': {
			if (props.userId) {
				return getFilesFromUser(props.userId, currentPage.value, currentLimit.value);
			} else if (props.ip) {
				return getFilesFromIP(props.ip, currentPage.value, currentLimit.value);
			} else {
				return getFilesAdmin(currentPage.value, currentLimit.value, anonymous.value);
			}
		}

		case 'quarantine':
			return getFilesAdmin(currentPage.value, currentLimit.value, false, true);
		case 'album':
			return getAlbum(props.uuid!, currentPage.value);
		case 'publicAlbum':
			return getFilesFromPublicAlbum(props.identifier!, currentPage.value, currentLimit.value);
		case 'uploads':
			return getFiles(currentPage.value, currentLimit.value);
		default:
			break;
	}
};

const { data } = useQuery({
	queryKey: fetchKey,
	queryFn: () => typeToFetch(page, limit, anon),
	keepPreviousData: true
});

const prevPage = () => {
	page.value = Math.max(page.value - 1, 1);
};

const nextPage = () => {
	page.value = Math.min(page.value + 1, data.value.count);
};

const goToPage = (goTo: number) => {
	page.value = goTo;
};

const preferMasonry = computed(() => userStore.preferences.preferMasonry);
const toggleMasonry = () => {
	userStore.preferences.preferMasonry = !userStore.preferences.preferMasonry;
	userStore.savePreferences();
};
</script>
