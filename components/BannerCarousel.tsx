import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SkeletonLoader } from './SkeletonLoader';
import { API_ENDPOINTS } from '@/constants/api';

const { width } = Dimensions.get('window');

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
}

export const BannerCarousel: React.FC = () => {
  const scrollRef = useRef<ScrollView>(null);
  const currentIndex = useRef(1); // Start from 1 (first real image)
  const [isLoading, setIsLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [infiniteBanners, setInfiniteBanners] = useState<Banner[]>([]);

  const handleBannerClick = async (bannerId: string) => {
    try {
      await fetch(`${API_ENDPOINTS.BASE_URL}/scroller/${bannerId}/click`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error tracking banner click:', error);
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/scroller/`);
      const result = await response.json();
      
      if (result.success && result.data && result.data.scrollers) {
        const bannerData = result.data.scrollers.map((item: any) => ({
          id: item.id,
          imageUrl: item.imageUrl,
          title: item.title
        }));
        setBanners(bannerData.filter((banner: Banner) => banner.imageUrl));
      } else {
        // Fallback to default banners
        setBanners([
          { id: '1', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=200&fit=crop', title: 'Banner 1' },
          { id: '2', imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=200&fit=crop', title: 'Banner 2' },
          { id: '3', imageUrl: 'https://images.unsplash.com/photo-1506617564039-2f3b650b7010?w=400&h=200&fit=crop', title: 'Banner 3' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      // Fallback to default banners
      setBanners([
        { id: '1', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=200&fit=crop', title: 'Banner 1' },
        { id: '2', imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=200&fit=crop', title: 'Banner 2' },
        { id: '3', imageUrl: 'https://images.unsplash.com/photo-1506617564039-2f3b650b7010?w=400&h=200&fit=crop', title: 'Banner 3' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Create infinite scroll array with duplicates
  useEffect(() => {
    if (banners.length > 0) {
      const lastBanner = banners[banners.length - 1];
      const firstBanner = banners[0];
      setInfiniteBanners([lastBanner, ...banners, firstBanner]);
      
      // Set initial position to first real image
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: width, animated: false });
      }, 100);
    }
  }, [banners]);

  useEffect(() => {
    if (infiniteBanners.length > 0) {
      const interval = setInterval(() => {
        currentIndex.current += 1;
        scrollRef.current?.scrollTo({
          x: currentIndex.current * width,
          animated: true,
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [infiniteBanners]);

  const handleScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    
    // Reset to beginning if at the end
    if (index === infiniteBanners.length - 1) {
      currentIndex.current = 1;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: width, animated: false });
      }, 50);
    }
    // Reset to end if at the beginning
    else if (index === 0) {
      currentIndex.current = infiniteBanners.length - 2;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: (infiniteBanners.length - 2) * width, animated: false });
      }, 50);
    } else {
      currentIndex.current = index;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.scrollView}>
          <SkeletonLoader width={width * 0.9} height={180} borderRadius={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        decelerationRate="fast"
        style={styles.scrollView}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {infiniteBanners.map((banner, index) => (
          <View key={`${banner.id}-${index}`} style={styles.bannerContainer}>
            <TouchableOpacity onPress={() => handleBannerClick(banner.id)}>
              <Image source={{ uri: banner.imageUrl }} style={styles.banner} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    marginVertical: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bannerContainer: {
    // width: width - 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 25,
    marginLeft: 5,
  },
  banner: {
    width: width - 32,
    height: 180,
    borderRadius: 12,
  },
});



